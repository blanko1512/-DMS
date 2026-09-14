import json
import os
from pathlib import Path

from solcx import compile_source, install_solc
from web3 import Web3
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent
CONTRACT_PATH = ROOT / "DocumentIntegrityRegistry.sol"
ARTIFACT_PATH = ROOT / "artifact.json"
SOLC_VERSION = "0.8.20"
load_dotenv(ROOT.parent / ".env")


rpc_url = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
if not private_key:
    raise RuntimeError("Set BLOCKCHAIN_PRIVATE_KEY in the environment before deployment.")

install_solc(SOLC_VERSION)
source = CONTRACT_PATH.read_text(encoding="utf-8")
compiled = compile_source(source, solc_version=SOLC_VERSION)
contract_data = next(iter(compiled.values()))
web3 = Web3(Web3.HTTPProvider(rpc_url))
if not web3.is_connected():
    raise RuntimeError(f"Cannot connect to blockchain RPC at {rpc_url}.")
account = web3.eth.account.from_key(private_key)
contract = web3.eth.contract(abi=contract_data["abi"], bytecode=contract_data["bin"])
nonce = web3.eth.get_transaction_count(account.address)
tx = contract.constructor().build_transaction({
    "from": account.address,
    "nonce": nonce,
    "chainId": web3.eth.chain_id,
    "gas": 2_000_000,
    "gasPrice": web3.eth.gas_price,
})
signed = account.sign_transaction(tx)
tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
ARTIFACT_PATH.write_text(json.dumps({"abi": contract_data["abi"], "address": receipt.contractAddress}, indent=2), encoding="utf-8")
print(f"contract_address={receipt.contractAddress}")
print(f"deployment_transaction={tx_hash.hex()}")
