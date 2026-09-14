import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from web3 import Web3

from app.models.blockchain_record import BlockchainRecord
from app.models.document import Document
from app.models.document_version import DocumentVersion


ARTIFACT_PATH = Path(__file__).resolve().parents[2] / "blockchain" / "artifact.json"
NETWORK = "local-ganache"
logger = logging.getLogger(__name__)


def _web3() -> tuple[Web3, object, str]:
    rpc_url = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")
    address = os.getenv("BLOCKCHAIN_CONTRACT_ADDRESS", "")
    if not private_key or not address:
        raise HTTPException(status_code=503, detail="Local blockchain is not configured. Set BLOCKCHAIN_PRIVATE_KEY and BLOCKCHAIN_CONTRACT_ADDRESS.")
    if not ARTIFACT_PATH.exists():
        raise HTTPException(status_code=503, detail="Blockchain contract artifact is missing. Deploy the local contract first.")
    artifact = json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        raise HTTPException(status_code=503, detail="Local blockchain is unavailable. Start Ganache and try again.")
    configured_address = Web3.to_checksum_address(address)
    artifact_address = artifact.get("address")
    if artifact_address and Web3.to_checksum_address(artifact_address) != configured_address:
        raise HTTPException(status_code=503, detail="Configured contract address does not match the deployed artifact.")
    if not any(item.get("name") == "getProof" for item in artifact["abi"]):
        raise HTTPException(status_code=503, detail="Blockchain contract ABI does not contain the proof retrieval function.")
    if not web3.eth.get_code(configured_address):
        raise HTTPException(status_code=503, detail="Configured blockchain contract is not deployed on the active RPC network.")
    account = web3.eth.account.from_key(private_key)
    contract = web3.eth.contract(address=configured_address, abi=artifact["abi"])
    logger.info("Connected to blockchain RPC=%s contract=%s chain_id=%s", rpc_url, configured_address, web3.eth.chain_id)
    return web3, account, contract


def proof_payload(document_id: str, version_id: str, sha256: str) -> str:
    return json.dumps({"document_id": document_id, "version_id": version_id, "sha256": sha256}, sort_keys=True, separators=(",", ":"))


def _latest_version(document: Document) -> DocumentVersion:
    if not document.versions:
        raise HTTPException(status_code=409, detail="This document has no version record to anchor.")
    return max(document.versions, key=lambda version: version.version_number)


def create_proof(db, document: Document, version: DocumentVersion | None = None) -> BlockchainRecord:
    version = version or _latest_version(document)
    if not version.sha256_hash:
        raise HTTPException(status_code=409, detail="The selected version has no SHA-256 hash.")
    web3, account, contract = _web3()
    payload = proof_payload(str(document.id), str(version.id), version.sha256_hash)
    key = web3.keccak(text=payload)
    proof_hash = web3.keccak(text=payload)
    try:
        nonce = web3.eth.get_transaction_count(account.address)
        transaction = contract.functions.registerProof(key, proof_hash).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "chainId": web3.eth.chain_id,
            "gas": 200000,
            "gasPrice": web3.eth.gas_price,
        })
        signed = account.sign_transaction(transaction)
        tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Local blockchain proof registration failed.") from error
    record = BlockchainRecord(
        document_id=document.id,
        version_id=version.id,
        version_number=version.version_number,
        sha256_hash=version.sha256_hash,
        proof_hash=Web3.to_hex(proof_hash),
        transaction_id=tx_hash.hex(),
        network=NETWORK,
        verification_status="ANCHORED",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def verify_proof(db, document: Document, version: DocumentVersion | None = None, sha256_override: str | None = None) -> dict:
    version = version or _latest_version(document)
    current_sha256 = sha256_override or version.sha256_hash
    record = db.query(BlockchainRecord).filter(
        BlockchainRecord.document_id == document.id,
        BlockchainRecord.version_id == version.id,
    ).order_by(BlockchainRecord.timestamp.desc()).first()
    if not record:
        logger.info("No blockchain record for document=%s version=%s", document.id, version.id)
        return {
            "integrity_status": "NOT_ANCHORED",
            "current_sha256": current_sha256,
            "blockchain_proof": None,
            "transaction_hash": None,
            "network": None,
        }
    logger.info(
        "Blockchain record found document=%s version=%s record_id=%s",
        document.id,
        version.id,
        record.id,
    )
    web3, _, contract = _web3()
    payload = proof_payload(str(document.id), str(version.id), record.sha256_hash)
    expected = web3.keccak(text=payload)
    logger.info("Retrieving blockchain proof document=%s version=%s proof_key=%s", document.id, version.id, Web3.to_hex(expected))
    try:
        stored = contract.functions.getProof(expected).call()
    except Exception as error:
        raise HTTPException(status_code=502, detail="Local blockchain proof retrieval failed.") from error
    blockchain_proof = Web3.to_hex(stored)
    logger.info(
        "Blockchain proof retrieved document=%s version=%s has_value=%s",
        document.id,
        version.id,
        stored != bytes(32),
    )
    status = "VERIFIED" if (
        current_sha256 == record.sha256_hash
        and blockchain_proof.lower() == record.proof_hash.lower()
        and stored != bytes(32)
    ) else "MISMATCH"
    return {
        "integrity_status": status,
        "current_sha256": current_sha256,
        "blockchain_proof": blockchain_proof,
        "transaction_hash": record.transaction_id,
        "network": record.network or NETWORK,
    }
