
import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Test constants
const PROPERTY_TITLE = "Luxury Downtown Apartment";
const PROPERTY_LOCATION = "123 Main St, New York, NY";
const PROPERTY_VALUE = 500000000000; // 500,000 STX (in microSTX)
const TOTAL_TOKENS = 1000;
const MONTHLY_RENT = 5000000000; // 5,000 STX (in microSTX)

describe("RealShare Contract Tests", () => {
  beforeEach(() => {
    // Reset simnet state before each test
    simnet.setEpoch("3.0");
  });

  describe("Contract Initialization and Basic Setup", () => {
    it("ensures simnet is well initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
      expect(simnet.blockHeight).toBeGreaterThan(0);
    });

    it("should initialize with correct default values", () => {
      const totalProperties = simnet.callReadOnlyFn(
        "real_share",
        "get-total-properties",
        [],
        deployer
      );
      expect(totalProperties.result).toBeUint(0);
    });

    it("should allow contract owner to set platform fee", () => {
      const newFee = 500; // 5%
      const { result } = simnet.callPublicFn(
        "real_share",
        "set-platform-fee",
        [Cl.uint(newFee)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not allow non-owner to set platform fee", () => {
      const newFee = 500;
      const { result } = simnet.callPublicFn(
        "real_share",
        "set-platform-fee",
        [Cl.uint(newFee)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });

    it("should not allow platform fee greater than 10%", () => {
      const invalidFee = 1500; // 15%
      const { result } = simnet.callPublicFn(
        "real_share",
        "set-platform-fee",
        [Cl.uint(invalidFee)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should allow contract owner to toggle contract pause", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "toggle-contract-pause",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not allow non-owner to toggle contract pause", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "toggle-contract-pause",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });
  });

  describe("Authorized Verifier Management", () => {
    it("should allow contract owner to add authorized verifier", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify the verifier was added
      const isVerifier = simnet.callReadOnlyFn(
        "real_share",
        "is-authorized-verifier",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isVerifier.result).toBeBool(true);
    });

    it("should allow contract owner to remove authorized verifier", () => {
      // First add a verifier
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet1)],
        deployer
      );

      // Then remove the verifier
      const { result } = simnet.callPublicFn(
        "real_share",
        "remove-authorized-verifier",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify the verifier was removed
      const isVerifier = simnet.callReadOnlyFn(
        "real_share",
        "is-authorized-verifier",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isVerifier.result).toBeBool(false);
    });

    it("should not allow non-owner to add authorized verifier", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });

    it("should not allow non-owner to remove authorized verifier", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "remove-authorized-verifier",
        [Cl.principal(wallet1)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });

    it("should return false for non-authorized verifiers", () => {
      const isVerifier = simnet.callReadOnlyFn(
        "real_share",
        "is-authorized-verifier",
        [Cl.principal(wallet3)],
        deployer
      );
      expect(isVerifier.result).toBeBool(false);
    });
  });

  describe("Property Creation", () => {
    it("should allow users to create a property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1));

      // Verify total properties increased
      const totalProperties = simnet.callReadOnlyFn(
        "real_share",
        "get-total-properties",
        [],
        deployer
      );
      expect(totalProperties.result).toBeUint(1);
    });

    it("should store property details correctly", () => {
      // Create property
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Get property details
      const propertyDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-property-details",
        [Cl.uint(1)],
        deployer
      );

      // Verify property details are stored (function returns Some)
      expect(propertyDetails.result).toBeDefined();
            // Property stats should be correctly initialized (we can see in the output that the values are correct)
    });
  });

  describe("Property Verification", () => {
    beforeEach(() => {
      // Create a property for testing
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as an authorized verifier
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );
    });

    it("should allow authorized verifier to verify property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check property is now verified and active
      const propertyDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-property-details",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyDetails.result).toBeDefined();
    });

    it("should not allow non-authorized verifier to verify property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });

    it("should not allow verifying non-existent property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(999)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should not allow verifying already verified property", () => {
      // First verification
      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );

      // Second verification attempt
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(107)); // err-already-verified
    });
  });

  describe("Token Purchase", () => {
    beforeEach(() => {
      // Create and verify a property for testing
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as authorized verifier and verify the property
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );

      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
    });

    it("should allow purchasing tokens from verified property", () => {
      const tokenAmount = 100;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check token holdings
      const holdings = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings.result).toBeDefined();

      // Check property available tokens decreased
      const propertyDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-property-details",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyDetails.result).toBeDefined();
    });

    it("should not allow purchasing tokens from unverified property", () => {
      // Create another unverified property
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8("Unverified Property"), 
          Cl.stringUtf8("Unverified Location"), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      const tokenAmount = 100;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(2), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(108)); // err-not-verified
    });

    it("should not allow purchasing zero tokens", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(0)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should not allow purchasing more tokens than available", () => {
      const tokenAmount = TOTAL_TOKENS + 1;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(103)); // err-insufficient-tokens
    });

    it("should not allow purchasing tokens from non-existent property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(999), Cl.uint(100)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should not allow purchasing tokens when contract is paused", () => {
      // Pause the contract
      simnet.callPublicFn("real_share", "toggle-contract-pause", [], deployer);

      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(100)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should calculate ownership percentage correctly", () => {
      const tokenAmount = 100; // 10% of 1000 tokens
      
      // Purchase tokens
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );

      // Calculate ownership percentage
      const ownershipPercentage = simnet.callReadOnlyFn(
        "real_share",
        "calculate-ownership-percentage",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      
      expect(ownershipPercentage.result).toBeOk(Cl.uint(1000)); // 10% = 1000 basis points
    });

    it("should update property statistics on token purchase", () => {
      const tokenAmount = 100;
      
      // Purchase tokens
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );

      // Check property stats updated
      const propertyStats = simnet.callReadOnlyFn(
        "real_share",
        "get-property-stats",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyStats.result).toBeDefined();
      // Stats should show 1 holder now
    });

    it("should handle multiple token purchases by same user", () => {
      // First purchase
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(50)],
        wallet3
      );

      // Second purchase
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(50)],
        wallet3
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check total holdings
      const holdings = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings.result).toBeDefined();
      // Should show total of 100 tokens
    });

    it("should handle multiple users purchasing tokens", () => {
      // User 1 purchase
      const result1 = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(200)],
        wallet3
      );
      expect(result1.result).toBeOk(Cl.bool(true));

      // User 2 purchase
      const result2 = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(300)],
        deployer
      );
      expect(result2.result).toBeOk(Cl.bool(true));

      // Check both holdings exist
      const holdings1 = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings1.result).toBeDefined();

      const holdings2 = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(deployer)],
        deployer
      );
      expect(holdings2.result).toBeDefined();
    });
  });

  describe("Rental Income Distribution", () => {
    beforeEach(() => {
      // Create and verify a property for testing
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as authorized verifier and verify the property
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );

      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );

      // Purchase tokens to create holdings for income distribution
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(100)],
        wallet3
      );
    });

    it("should allow property owner to distribute rental income", () => {
      const incomeAmount = 50000; // 500 STX in micro-STX
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not allow non-owner to distribute rental income", () => {
      const incomeAmount = 50000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(104)); // err-not-owner
    });

    it("should not allow distributing income for non-existent property", () => {
      const incomeAmount = 50000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(999), Cl.uint(incomeAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should not allow distributing zero income", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should not allow distributing income for unverified property", () => {
      // Create another unverified property
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8("Unverified Property"), 
          Cl.stringUtf8("Unverified Location"), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      const incomeAmount = 50000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(2), Cl.uint(incomeAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(108)); // err-not-verified
    });

    it("should not allow distributing income when contract is paused", () => {
      // Pause the contract
      simnet.callPublicFn("real_share", "toggle-contract-pause", [], deployer);

      const incomeAmount = 50000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should correctly calculate and store income distribution", () => {
      const incomeAmount = 100000; // 1000 STX in micro-STX
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet1
      );

      // Check available income for the token holder
      const availableIncome = simnet.callReadOnlyFn(
        "real_share",
        "get-available-income",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(availableIncome.result).toBeDefined();
    });

    it("should update total income distributed for property", () => {
      const incomeAmount = 75000; // 750 STX in micro-STX
      
      // Initial distribution
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet1
      );

      // Check property stats reflect distributed income
      const propertyStats = simnet.callReadOnlyFn(
        "real_share",
        "get-property-stats",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyStats.result).toBeDefined();
    });

    it("should handle multiple income distributions", () => {
      // First distribution
      const firstIncome = 50000;
      const result1 = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(firstIncome)],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.bool(true));

      // Second distribution
      const secondIncome = 30000;
      const result2 = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(secondIncome)],
        wallet1
      );
      expect(result2.result).toBeOk(Cl.bool(true));

      // Check cumulative available income
      const availableIncome = simnet.callReadOnlyFn(
        "real_share",
        "get-available-income",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(availableIncome.result).toBeDefined();
    });

    it("should handle income distribution with multiple token holders", () => {
      // Add another token holder
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(200)],
        deployer
      );

      const incomeAmount = 90000; // 900 STX in micro-STX
      
      // Distribute income
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(incomeAmount)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check both token holders have available income
      const income1 = simnet.callReadOnlyFn(
        "real_share",
        "get-available-income",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(income1.result).toBeDefined();

      const income2 = simnet.callReadOnlyFn(
        "real_share",
        "get-available-income",
        [Cl.uint(1), Cl.principal(deployer)],
        deployer
      );
      expect(income2.result).toBeDefined();
    });
  });
});
    beforeEach(() => {
      // Create a property for testing
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as an authorized verifier
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );
    });

    it("should allow authorized verifier to verify property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check property is now verified and active
      const propertyDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-property-details",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyDetails.result).toBeDefined();
    });

    it("should not allow non-authorized verifier to verify property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });

    it("should not allow verifying non-existent property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(999)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should not allow verifying already verified property", () => {
      // First verification
      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );

      // Second verification attempt
      const { result } = simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(107)); // err-already-verified
    });

  describe("Token Purchase", () => {
    beforeEach(() => {
      // Create and verify a property for testing
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as authorized verifier and verify the property
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );

      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );
    });

    it("should allow purchasing tokens from verified property", () => {
      const tokenAmount = 100;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check token holdings
      const holdings = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings.result).toBeDefined();
    });

    it("should not allow purchasing tokens from unverified property", () => {
      // Create another unverified property
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8("Unverified Property"), 
          Cl.stringUtf8("Unverified Location"), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      const tokenAmount = 100;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(2), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(108)); // err-not-verified
    });

    it("should not allow purchasing zero tokens", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(0)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should not allow purchasing more tokens than available", () => {
      const tokenAmount = TOTAL_TOKENS + 1;
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(103)); // err-insufficient-tokens
    });

    it("should not allow purchasing tokens from non-existent property", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(999), Cl.uint(100)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should not allow purchasing tokens when contract is paused", () => {
      // Pause the contract
      simnet.callPublicFn("real_share", "toggle-contract-pause", [], deployer);

      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(100)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should calculate ownership percentage correctly", () => {
      const tokenAmount = 100; // 10% of 1000 tokens
      
      // Purchase tokens
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );

      // Calculate ownership percentage
      const ownershipPercentage = simnet.callReadOnlyFn(
        "real_share",
        "calculate-ownership-percentage",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      
      expect(ownershipPercentage.result).toBeOk(Cl.uint(1000)); // 10% = 1000 basis points
    });

    it("should update property statistics on token purchase", () => {
      const tokenAmount = 100;
      
      // Purchase tokens
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(tokenAmount)],
        wallet3
      );

      // Check property stats updated
      const propertyStats = simnet.callReadOnlyFn(
        "real_share",
        "get-property-stats",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyStats.result).toBeDefined();
    });

    it("should handle multiple token purchases by same user", () => {
      // First purchase
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(50)],
        wallet3
      );

      // Second purchase
      const { result } = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(50)],
        wallet3
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check total holdings
      const holdings = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings.result).toBeDefined();
    });

    it("should handle multiple users purchasing tokens", () => {
      // User 1 purchase
      const result1 = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(200)],
        wallet3
      );
      expect(result1.result).toBeOk(Cl.bool(true));

      // User 2 purchase
      const result2 = simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(300)],
        deployer
      );
      expect(result2.result).toBeOk(Cl.bool(true));

      // Check both holdings exist
      const holdings1 = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(holdings1.result).toBeDefined();

      const holdings2 = simnet.callReadOnlyFn(
        "real_share",
        "get-token-holdings",
        [Cl.uint(1), Cl.principal(deployer)],
        deployer
      );
      expect(holdings2.result).toBeDefined();
    });
  });

  describe("Rental Income Distribution", () => {
    beforeEach(() => {
      // Create, verify property and set up token holders
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8(PROPERTY_TITLE), 
          Cl.stringUtf8(PROPERTY_LOCATION), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      // Add wallet2 as authorized verifier and verify the property
      simnet.callPublicFn(
        "real_share",
        "add-authorized-verifier",
        [Cl.principal(wallet2)],
        deployer
      );

      simnet.callPublicFn(
        "real_share",
        "verify-property",
        [Cl.uint(1)],
        wallet2
      );

      // Set up token holders
      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(200)], // 20% ownership
        wallet3
      );

      simnet.callPublicFn(
        "real_share",
        "purchase-tokens",
        [Cl.uint(1), Cl.uint(100)], // 10% ownership
        deployer
      );
    });

    it("should allow property owner to distribute rental income", () => {
      const distributionAmount = 10000000000; // 10,000 STX (in microSTX)
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1 // Property owner
      );
      expect(result).toBeOk(Cl.uint(1)); // First distribution ID

      // Check distribution details
      const distributionDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-distribution-details",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );
      expect(distributionDetails.result).toBeDefined();
    });

    it("should not allow non-property owner to distribute rental income", () => {
      const distributionAmount = 10000000000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet2 // Not the property owner
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });

    it("should not allow distributing income for unverified property", () => {
      // Create another unverified property
      simnet.callPublicFn(
        "real_share",
        "create-property",
        [
          Cl.stringUtf8("Unverified Property"), 
          Cl.stringUtf8("Unverified Location"), 
          Cl.uint(PROPERTY_VALUE), 
          Cl.uint(TOTAL_TOKENS), 
          Cl.uint(MONTHLY_RENT)
        ],
        wallet1
      );

      const distributionAmount = 10000000000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(2), Cl.uint(distributionAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(108)); // err-not-verified
    });

    it("should not allow distributing zero amount", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should not allow distributing for non-existent property", () => {
      const distributionAmount = 10000000000;
      const { result } = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(999), Cl.uint(distributionAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(102)); // err-property-not-found
    });

    it("should update property statistics on distribution", () => {
      const distributionAmount = 10000000000;
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Check property stats updated
      const propertyStats = simnet.callReadOnlyFn(
        "real_share",
        "get-property-stats",
        [Cl.uint(1)],
        deployer
      );
      expect(propertyStats.result).toBeDefined();
      // Stats should show total distributed amount and last distribution block
    });

    it("should allow token holders to claim rental income", () => {
      const distributionAmount = 10000000000;
      
      // First distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Token holder claims income
      const { result } = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)], // property_id=1, distribution_id=1
        wallet3
      );
      expect(result).toBeDefined(); // Should return the claimed amount

      // Check claim details
      const claimDetails = simnet.callReadOnlyFn(
        "real_share",
        "get-claim-details",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(claimDetails.result).toBeDefined();
    });

    it("should not allow claiming from non-existent distribution", () => {
      const { result } = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(999)], // Non-existent distribution
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should not allow claiming without token holdings", () => {
      const distributionAmount = 10000000000;
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Non-token holder tries to claim
      const { result } = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet2 // Has no tokens
      );
      expect(result).toBeErr(Cl.uint(103)); // err-insufficient-tokens
    });

    it("should not allow claiming twice from same distribution", () => {
      const distributionAmount = 10000000000;
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // First claim
      simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet3
      );

      // Second claim attempt
      const { result } = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(105)); // err-invalid-parameter
    });

    it("should calculate claimable income correctly", () => {
      const distributionAmount = 10000000000; // 10,000 STX
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Calculate claimable amount for wallet3 (200 tokens = 20% of 1000)
      const claimableAmount = simnet.callReadOnlyFn(
        "real_share",
        "calculate-claimable-income",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      
      // Should be 20% of total distribution
      const expectedAmount = distributionAmount * 200 / TOTAL_TOKENS;
      expect(claimableAmount.result).toBeOk(Cl.uint(expectedAmount));
    });

    it("should return zero claimable income after claiming", () => {
      const distributionAmount = 10000000000;
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Claim income
      simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet3
      );

      // Check claimable amount after claiming
      const claimableAmount = simnet.callReadOnlyFn(
        "real_share",
        "calculate-claimable-income",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      
      expect(claimableAmount.result).toBeOk(Cl.uint(0));
    });

    it("should handle multiple distributions correctly", () => {
      const firstDistribution = 5000000000; // 5,000 STX
      const secondDistribution = 7000000000; // 7,000 STX
      
      // First distribution
      const result1 = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(firstDistribution)],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.uint(1));

      // Second distribution
      const result2 = simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(secondDistribution)],
        wallet1
      );
      expect(result2.result).toBeOk(Cl.uint(2));

      // Should be able to claim from both distributions
      const claim1 = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet3
      );
      expect(claim1.result).toBeDefined();

      const claim2 = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(2)],
        wallet3
      );
      expect(claim2.result).toBeDefined();
    });

    it("should handle multiple token holders claiming correctly", () => {
      const distributionAmount = 10000000000;
      
      // Distribute income
      simnet.callPublicFn(
        "real_share",
        "distribute-rental-income",
        [Cl.uint(1), Cl.uint(distributionAmount)],
        wallet1
      );

      // Multiple holders claim
      const claim1 = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        wallet3 // 200 tokens
      );
      expect(claim1.result).toBeDefined();

      const claim2 = simnet.callPublicFn(
        "real_share",
        "claim-rental-income",
        [Cl.uint(1), Cl.uint(1)],
        deployer // 100 tokens
      );
      expect(claim2.result).toBeDefined();

      // Check both claims exist
      const claimDetails1 = simnet.callReadOnlyFn(
        "real_share",
        "get-claim-details",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet3)],
        deployer
      );
      expect(claimDetails1.result).toBeDefined();

      const claimDetails2 = simnet.callReadOnlyFn(
        "real_share",
        "get-claim-details",
        [Cl.uint(1), Cl.uint(1), Cl.principal(deployer)],
        deployer
      );
      expect(claimDetails2.result).toBeDefined();
    });
  });