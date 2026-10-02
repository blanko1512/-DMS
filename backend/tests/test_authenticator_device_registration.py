import base64
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from Crypto.Hash import SHA256
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.authenticator_device import AuthenticatorDevice
from app.models.authenticator_challenge import AuthenticatorChallenge
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password
from app.services.authenticator_service import build_authenticator_challenge_payload


engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def make_user(email: str, name: str = 'User', is_active: bool = True) -> User:
    db = SessionLocal()
    try:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password('SecretPass123'),
            role='VIEWER',
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def make_signed_challenge(user: User, device_identifier: str):
    private_key = ECC.generate(curve='P-256')
    device = AuthenticatorDevice(
        user_id=user.id,
        device_identifier=device_identifier,
        public_key=base64.b64encode(
            private_key.public_key().export_key(format='DER'),
        ).decode('ascii'),
        is_active=True,
    )
    challenge = AuthenticatorChallenge(
        user_id=user.id,
        authenticator_device=device,
        status='PENDING',
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db = SessionLocal()
    try:
        db.add_all([device, challenge])
        db.commit()
        db.refresh(challenge)
        challenge_id = str(challenge.id)
        payload = build_authenticator_challenge_payload(
            challenge,
            device_identifier=device_identifier,
        )
    finally:
        db.close()

    digest = SHA256.new(payload.encode('utf-8'))
    signature = DSS.new(private_key, 'fips-186-3').sign(digest)
    return challenge_id, payload, base64.b64encode(signature).decode('ascii')


def create_authenticator_token(email: str, password: str, device_id: str) -> str:
    response = client.post(
        '/api/auth/authenticator/session',
        json={'email': email, 'password': password, 'device_id': device_id},
    )
    assert response.status_code == 200, response.text
    return response.json()['access_token']


def test_authenticated_device_registration_and_user_isolation():
    user_a = make_user('usera.device@example.com', name='User A')
    user_b = make_user('userb.device@example.com', name='User B')

    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)

    unauthenticated = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
    )
    assert unauthenticated.status_code == 401

    registered = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert registered.status_code == 200, registered.text
    payload = registered.json()
    assert payload['device_id'] == 'android-device-a-1'
    assert payload['device_name'] == 'My Android'
    assert payload['is_active'] is True

    duplicate = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()['device_id'] == 'android-device-a-1'

    devices = client.get('/api/auth/authenticator/devices', headers={'Authorization': f'Bearer {token_a}'})
    assert devices.status_code == 200, devices.text
    assert len(devices.json()) == 1
    assert devices.json()[0]['device_id'] == 'android-device-a-1'

    other_user_devices = client.get('/api/auth/authenticator/devices', headers={'Authorization': f'Bearer {token_b}'})
    assert other_user_devices.status_code == 200, other_user_devices.text
    assert other_user_devices.json() == []

    blocked = client.get(
        '/api/auth/authenticator/devices/android-device-a-1',
        headers={'Authorization': f'Bearer {token_b}'},
    )
    assert blocked.status_code == 404

    revoke = client.post(
        '/api/auth/authenticator/devices/android-device-a-1/revoke',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert revoke.status_code == 200, revoke.text
    assert revoke.json()['is_active'] is False

    db = SessionLocal()
    try:
        device = db.query(AuthenticatorDevice).filter(AuthenticatorDevice.device_identifier == 'android-device-a-1').first()
        assert device is not None
        assert device.is_active is False
        assert device.revoked_at is not None
        assert db.query(AuditLog).filter(AuditLog.action == 'AUTHENTICATOR_REVOKED').count() >= 1
    finally:
        db.close()


def test_authenticator_session_token_is_limited_to_authenticator_routes(monkeypatch):
    jwt_secret = secrets.token_urlsafe(32)
    monkeypatch.setenv('JWT_SECRET_KEY', jwt_secret)
    monkeypatch.setenv('JWT_ALGORITHM', 'HS256')
    user = make_user('scoped.authenticator@example.com', name='Scoped Authenticator')

    session = client.post(
        '/api/auth/authenticator/session',
        json={
            'email': 'scoped.authenticator@example.com',
            'password': 'SecretPass123',
            'device_id': 'scoped-authenticator-device',
        },
    )
    assert session.status_code == 200, session.text
    assert session.json()['can_register'] is True
    token = session.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    registered = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'scoped-authenticator-device', 'device_name': 'Scoped Android'},
        headers=headers,
    )
    assert registered.status_code == 200, registered.text
    assert registered.json()['device_id'] == 'scoped-authenticator-device'

    wrong_device = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'different-authenticator-device', 'device_name': 'Other Android'},
        headers=headers,
    )
    assert wrong_device.status_code == 403

    other_device_session = client.post(
        '/api/auth/authenticator/session',
        json={
            'email': 'scoped.authenticator@example.com',
            'password': 'SecretPass123',
            'device_id': 'different-authenticator-device',
        },
    )
    assert other_device_session.status_code == 200
    assert other_device_session.json()['can_register'] is False

    ordinary_user_endpoint = client.get('/api/auth/authenticator/devices', headers=headers)
    assert ordinary_user_endpoint.status_code == 401

    invalid_password = client.post(
        '/api/auth/authenticator/session',
        json={
            'email': 'scoped.authenticator@example.com',
            'password': 'incorrect',
            'device_id': 'scoped-authenticator-device',
        },
    )
    assert invalid_password.status_code == 401


def test_authenticator_device_approves_own_challenge_and_rejects_invalid_signature(monkeypatch):
    jwt_secret = secrets.token_urlsafe(32)
    monkeypatch.setenv('JWT_SECRET_KEY', jwt_secret)
    monkeypatch.setenv('JWT_ALGORITHM', 'HS256')
    email = 'approval.owner@example.com'
    user = make_user(email, name='Approval Owner')
    device_id = f'approval-owner-{uuid.uuid4()}'
    challenge_id, payload, signature = make_signed_challenge(user, device_id)
    token = create_authenticator_token(email, 'SecretPass123', device_id)

    claims = jwt.decode(token, jwt_secret, algorithms=['HS256'])
    assert claims['token_use'] == 'authenticator'
    assert claims['exp'] - claims['iat'] == 600

    request = {
        'challenge_id': challenge_id,
        'device_id': device_id,
        'payload': payload,
    }
    headers = {'Authorization': f'Bearer {token}'}

    invalid_signature = client.post(
        '/api/auth/authenticator/approve',
        json={**request, 'signature': base64.b64encode(bytes(64)).decode('ascii')},
        headers=headers,
    )
    assert invalid_signature.status_code == 401
    assert invalid_signature.json()['detail'] == 'Signature verification failed.'

    approved = client.post(
        '/api/auth/authenticator/approve',
        json={**request, 'signature': signature},
        headers=headers,
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()['status'] == 'APPROVED'

    db = SessionLocal()
    try:
        challenge = db.get(AuthenticatorChallenge, uuid.UUID(challenge_id))
        assert challenge is not None
        assert challenge.status == 'APPROVED'
    finally:
        db.close()


def test_user_a_cannot_approve_user_b_challenge():
    user_a = make_user('approval.user.a@example.com', name='Approval User A')
    user_b = make_user('approval.user.b@example.com', name='Approval User B')
    device_a = f'approval-device-a-{uuid.uuid4()}'
    device_b = f'approval-device-b-{uuid.uuid4()}'
    make_signed_challenge(user_a, device_a)
    challenge_id, payload, signature = make_signed_challenge(user_b, device_b)
    access_token_a = create_access_token(user_a)

    response = client.post(
        '/api/auth/authenticator/approve',
        json={
            'challenge_id': challenge_id,
            'device_id': device_b,
            'payload': payload,
            'signature': signature,
        },
        headers={'Authorization': f'Bearer {access_token_a}'},
    )

    assert response.status_code == 403
    assert response.json()['detail'] == 'You cannot approve this challenge.'
    assert device_a != device_b


def test_authenticator_scoped_token_cannot_approve_another_users_challenge(monkeypatch):
    jwt_secret = secrets.token_urlsafe(32)
    monkeypatch.setenv('JWT_SECRET_KEY', jwt_secret)
    monkeypatch.setenv('JWT_ALGORITHM', 'HS256')
    email_a = 'approval.scoped.a@example.com'
    user_a = make_user(email_a, name='Scoped Approval User A')
    user_b = make_user('approval.scoped.b@example.com', name='Scoped Approval User B')
    device_a = f'scoped-approval-device-a-{uuid.uuid4()}'
    device_b = f'scoped-approval-device-b-{uuid.uuid4()}'
    challenge_id, payload, signature = make_signed_challenge(user_b, device_b)
    scoped_token_a = create_authenticator_token(email_a, 'SecretPass123', device_a)

    response = client.post(
        '/api/auth/authenticator/approve',
        json={
            'challenge_id': challenge_id,
            'device_id': device_b,
            'payload': payload,
            'signature': signature,
        },
        headers={'Authorization': f'Bearer {scoped_token_a}'},
    )

    assert response.status_code == 403
    assert response.json()['detail'] == 'You cannot approve this challenge.'
    assert user_a.id != user_b.id


def test_authenticator_approval_rejects_missing_invalid_and_expired_tokens(monkeypatch):
    jwt_secret = secrets.token_urlsafe(32)
    monkeypatch.setenv('JWT_SECRET_KEY', jwt_secret)
    monkeypatch.setenv('JWT_ALGORITHM', 'HS256')
    email = 'approval.token@example.com'
    user = make_user(email, name='Approval Token User')
    device_id = f'approval-token-device-{uuid.uuid4()}'
    challenge_id, _, _ = make_signed_challenge(user, device_id)
    approval_request = {
        'challenge_id': challenge_id,
        'device_id': device_id,
        'payload': 'unused while authorization fails',
        'signature': 'unused while authorization fails',
    }

    missing = client.post('/api/auth/authenticator/approve', json=approval_request)
    assert missing.status_code == 401

    invalid = client.post(
        '/api/auth/authenticator/approve',
        json=approval_request,
        headers={'Authorization': 'Bearer invalid-token'},
    )
    assert invalid.status_code == 401

    now = datetime.now(timezone.utc)
    expired_token = jwt.encode(
        {
            'sub': str(user.id),
            'token_use': 'authenticator',
            'device_id': device_id,
            'iat': now - timedelta(minutes=11),
            'exp': now - timedelta(minutes=1),
        },
        jwt_secret,
        algorithm='HS256',
    )
    expired = client.post(
        '/api/auth/authenticator/approve',
        json=approval_request,
        headers={'Authorization': f'Bearer {expired_token}'},
    )
    assert expired.status_code == 401


def test_device_registration_stores_public_key_for_device_bound_authenticator():
    user = make_user('publickey.device@example.com', name='Public Key User')
    token = create_access_token(user)

    public_key = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJit8iXn1T6dPzF5Ll2zH3y4Jm2cQdUQwB2qF6kUeM2yVj7nD4L7m7QvWwV3Zx5M2E6fZ8tQ1R0k=\n-----END PUBLIC KEY-----'

    response = client.post(
        '/api/auth/authenticator/register',
        json={
            'device_id': 'android-device-key-1',
            'device_name': 'Android Security Key Device',
            'public_key': public_key,
        },
        headers={'Authorization': f'Bearer {token}'},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['device_id'] == 'android-device-key-1'
    assert payload['public_key'] == public_key

    db = SessionLocal()
    try:
        device = db.query(AuthenticatorDevice).filter(AuthenticatorDevice.device_identifier == 'android-device-key-1').first()
        assert device is not None
        assert device.public_key == public_key
    finally:
        db.close()


def test_device_registration_rejects_duplicate_ownership_conflicts_and_keeps_existing_otp_flow():
    user_a = make_user('userc.device@example.com', name='User C')
    user_b = make_user('userd.device@example.com', name='User D')
    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)

    first = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'shared-device-1', 'device_name': 'Shared Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert first.status_code == 200, first.text

    second = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'shared-device-1', 'device_name': 'Shared Android'},
        headers={'Authorization': f'Bearer {token_b}'},
    )
    assert second.status_code == 409, second.text

    otp_user = make_user('otp.user@example.com', name='OTP User')
    otp_login = client.post(
        '/api/auth/login',
        json={'email': 'otp.user@example.com', 'password': 'SecretPass123'},
    )
    assert otp_login.status_code == 200, otp_login.text
    assert otp_login.json()['status'] == 'OTP_REQUIRED'


def test_authenticator_challenge_reads_require_matching_authenticated_user_and_device():
    user_a = make_user('challenge.user.a@example.com', name='Challenge User A')
    user_b = make_user('challenge.user.b@example.com', name='Challenge User B')
    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)
    db = SessionLocal()
    try:
        device = AuthenticatorDevice(
            user_id=user_a.id,
            device_identifier='challenge-device-a',
            is_active=True,
        )
        challenge = AuthenticatorChallenge(
            user_id=user_a.id,
            authenticator_device=device,
            status='PENDING',
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add_all([device, challenge])
        db.commit()
        db.refresh(challenge)
        challenge_id = str(challenge.id)
    finally:
        db.close()

    assert client.get(f'/api/auth/authenticator-challenge/{challenge_id}').status_code == 401
    assert client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token_b}'},
    ).status_code == 403
    allowed = client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert allowed.status_code == 200
    assert allowed.json()['challenge_id'] == challenge_id

    assert client.get('/api/auth/authenticator-challenges/device/challenge-device-a').status_code == 401
    assert client.get(
        '/api/auth/authenticator-challenges/device/challenge-device-a',
        headers={'Authorization': f'Bearer {token_b}'},
    ).status_code == 404
    device_pending = client.get(
        '/api/auth/authenticator-challenges/device/challenge-device-a',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert device_pending.status_code == 200
    assert device_pending.json()[0]['challenge_id'] == challenge_id


def test_authenticator_challenge_reads_exclude_revoked_devices_and_expire_pending_challenges():
    user = make_user('challenge.expired@example.com', name='Expired Challenge User')
    token = create_access_token(user)
    db = SessionLocal()
    try:
        device = AuthenticatorDevice(
            user_id=user.id,
            device_identifier='expired-device',
            is_active=True,
            revoked_at=datetime.now(timezone.utc),
        )
        expired = AuthenticatorChallenge(
            user_id=user.id,
            authenticator_device=device,
            status='PENDING',
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db.add_all([device, expired])
        db.commit()
        db.refresh(expired)
        challenge_id = str(expired.id)
    finally:
        db.close()

    status_response = client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert status_response.status_code == 200
    assert status_response.json()['status'] == 'EXPIRED'
    revoked_response = client.get(
        '/api/auth/authenticator-challenges/device/expired-device',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert revoked_response.status_code == 404
