// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentIntegrityRegistry {
    mapping(bytes32 => bytes32) private proofs;

    function registerProof(bytes32 proofKey, bytes32 proofHash) external {
        require(proofs[proofKey] == bytes32(0), "Proof already registered");
        proofs[proofKey] = proofHash;
    }

    function getProof(bytes32 proofKey) external view returns (bytes32) {
        return proofs[proofKey];
    }
}
