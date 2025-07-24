;; RealShare - Real Estate Fractional Ownership Platform

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-property-not-found (err u102))
(define-constant err-insufficient-tokens (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-invalid-parameter (err u105))
(define-constant err-property-not-active (err u106))
(define-constant err-already-verified (err u107))
(define-constant err-not-verified (err u108))

;; Data variables
(define-data-var total-properties uint u0)
(define-data-var platform-fee-percentage uint u200) ;; 2%
(define-data-var total-platform-fees uint u0)
(define-data-var contract-paused bool false)

;; Property data structure
(define-map properties
    uint
    {
        owner: principal,
        title: (string-utf8 128),
        location: (string-utf8 256),
        property-value: uint,
        total-tokens: uint,
        available-tokens: uint,
        monthly-rent: uint,
        verified: bool,
        active: bool,
        created-at: uint,
    }
)

;; Token ownership tracking
(define-map token-holdings
    {
        property-id: uint,
        holder: principal,
    }
    {
        tokens: uint,
        purchase-price: uint,
        acquired-at: uint,
    }
)

;; Property verification by authorized verifiers
(define-map authorized-verifiers
    principal
    bool
)

;; Property statistics
(define-map property-stats
    uint
    {
        total-holders: uint,
        total-distributed: uint,
        last-distribution: uint,
        appreciation-rate: uint,
    }
)

;; Read-only functions
(define-read-only (get-property-details (property-id uint))
    (map-get? properties property-id)
)

(define-read-only (get-token-holdings
        (property-id uint)
        (holder principal)
    )
    (map-get? token-holdings {
        property-id: property-id,
        holder: holder,
    })
)

(define-read-only (get-property-stats (property-id uint))
    (map-get? property-stats property-id)
)

(define-read-only (get-total-properties)
    (var-get total-properties)
)

(define-read-only (is-authorized-verifier (verifier principal))
    (default-to false (map-get? authorized-verifiers verifier))
)

(define-read-only (calculate-ownership-percentage
        (property-id uint)
        (holder principal)
    )
    (let (
            (property (unwrap! (map-get? properties property-id) (err u0)))
            (holding (unwrap!
                (map-get? token-holdings {
                    property-id: property-id,
                    holder: holder,
                })
                (err u0)
            ))
        )
        (ok (/ (* (get tokens holding) u10000) (get total-tokens property)))
    )
)

;; Private functions
(define-private (calculate-platform-fee (amount uint))
    (/ (* amount (var-get platform-fee-percentage)) u10000)
)
