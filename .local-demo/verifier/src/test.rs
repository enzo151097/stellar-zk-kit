#![cfg(test)]
use super::*;
use soroban_sdk::{Env, Bytes, BytesN, contract, contractimpl, Symbol};

// Mock base verifier for testing without Wasm deployment
#[contract]
pub struct MockBaseVerifier;

#[contractimpl]
impl MockBaseVerifier {
    pub fn set_vk(env: Env, _vk_json: Bytes) -> BytesN<32> {
        BytesN::from_array(&env, &[0; 32])
    }
    pub fn verify_proof_with_stored_vk(env: Env, proof_blob: Bytes) -> Option<BytesN<32>> {
        let expected: Bytes = env.storage().instance().get(&Symbol::new(&env, "expected")).unwrap();
        if proof_blob == expected {
            Some(BytesN::from_array(&env, &[0; 32]))
        } else {
            None
        }
    }
    // Setup helper
    pub fn set_expected(env: Env, expected: Bytes) {
        env.storage().instance().set(&Symbol::new(&env, "expected"), &expected);
    }
}

#[test]
fn test_public_input_mutations() {
    let env = Env::default();
    
    let mock_base_id = env.register_contract(None, MockBaseVerifier);
    let contract_id = env.register_contract(None, ProofOfFundsVerifier);
    
    let mock_client = MockBaseVerifierClient::new(&env, &mock_base_id);
    let client = ProofOfFundsVerifierClient::new(&env, &contract_id);
    
    client.init(&Bytes::new(&env), &mock_base_id);

    let proof = Bytes::new(&env);
    
    let valid_min = 0u64;

    let valid_pubs = ProofOfFundsVerifier::pack_public_inputs(&env, &valid_min);
    let expected_blob = ProofOfFundsVerifier::pack_blob(&env, &valid_pubs, &proof);
    
    mock_client.set_expected(&expected_blob);

    let base_result = client.verify(
        &proof,
        &valid_min
    );
    assert_eq!(base_result, true, "Baseline should pass");

    {
        let mutated_min = 1u64;
        let result = client.verify(
            &proof,
            &mutated_min
        );
        assert_eq!(result, false, "Proof should fail when min is mutated");
    }
}
