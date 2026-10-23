# MediChain Signing-Key Strategy & Key Management Architecture

## 1. Executive Summary & Security Objectives
In MediChain (formerly MediLedger), clinical prescriptions and laboratory diagnostic reports are legally binding medical records requiring verifiable authorship, integrity, and non-repudiation.
To guarantee cryptographic integrity while complying with clinical data privacy laws (HIPAA, GDPR, FDA 21 CFR Part 11):
- **Never place private signing keys in the database**, database migrations, or database dumps.
- **Never expose private signing keys in the frontend web application bundle** or browser storage.
- **Never commit private keys to the Git repository** (`.gitignore` enforces exclusions on `.keystore/`, `*.key`, `*.pem`, `*.bin`).
- **Never anchor private signing keys or decryption keys on public or private blockchains**.
- The public blockchain ledger and public verification endpoints store only cryptographic hashes (`fileHash`) and opaque tokens (`verificationToken`).

---

## 2. Key Segregation: Public vs. Private

| Component | Storage Location | Accessibility | Purpose |
| :--- | :--- | :--- | :--- |
| **Issuer Public Key (`User.publicKeyPem`)** | PostgreSQL Database | Public / Read-Only | Allows any verifying entity or patient to verify the RSA-SHA256 signature against canonical document bytes. |
| **Issuer Private Key (Development)** | Local Keystore (`apps/api/.keystore/<userId>.key`) | Restricted OS filesystem (Permissions `0600`) | Enables local automated signing and test execution during development without third-party cloud dependencies. |
| **Issuer Private Key (Production)** | FIPS 140-2 Level 3 HSM / Cloud KMS | Restricted IAM Role Boundary | Hardware-isolated asymmetric key pair where the private key **never leaves the HSM boundary**. |

---

## 3. Local Development Strategy (`apps/api/.keystore/`)
During development and local testing:
1. **Isolated Keystore Path**: Private keys are maintained in `apps/api/.keystore/` (configured via `env.KEYSTORE_DIR`).
2. **Access Controls**:
   - The keystore directory is provisioned with `0700` permissions (`rwx------`).
   - Key files are written with `0600` permissions (`rw-------`).
   - Filenames are sanitized with `path.basename` to prevent path traversal attacks.
3. **Automated Lifecycle**:
   - Upon Doctor or Testing Lab registration, `AuthService` generates an RSA 2048-bit keypair (`crypto.generateKeyPairSync`).
   - The private key is saved directly to `.keystore/<userId>.key`.
   - Only the public key (`publicKeyPem`) is stored in the PostgreSQL database.
4. **Git Enforcement**:
   - The repository root `.gitignore` contains strict exclusion patterns:
     ```gitignore
     *.pem
     *.key
     .keystore/
     apps/api/.keystore/
     storage/
     apps/api/storage/
     *.bin
     ```

---

## 4. Production Key Management Architecture (Cloud KMS / HSM)
For production deployments, storing private keys on the web or API server filesystem is prohibited. The architecture transitions to a dedicated Hardware Security Module (HSM) or Cloud Key Management Service (KMS).

```
┌────────────────────────────────────────────────────────┐
│                   MediChain API Server                 │
│                                                        │
│  1. Compute Deterministic Canonical Document Bytes     │
│  2. Compute SHA-256 Digest of Canonical Bytes          │
└───────────────────────────┬────────────────────────────┘
                            │
              Asymmetric Sign Request (SHA-256 Hash Only)
              (Authenticated via mTLS & Cloud IAM Role)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│       Cloud KMS / Hardware Security Module (HSM)       │
│           (AWS KMS / Google Cloud KMS / Vault)         │
│                                                        │
│  • Private Key stored inside FIPS 140-2 Level 3 HSM    │
│  • Private key material CANNOT be exported or read     │
│  • Signs SHA-256 digest using RSA-PSS or RSA-PKCS1v15  │
│  • Returns Base64 Signature                            │
└───────────────────────────┬────────────────────────────┘
                            │
                   Base64 Signature
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   MediChain API Server                 │
│                                                        │
│  • Store file & signature privately in private storage │
│  • Record immutable DocumentVersion in PostgreSQL      │
│  • Write immutable AuditEvent                          │
│  • Submit SHA-256 Hash to Blockchain Smart Contract    │
└────────────────────────────────────────────────────────┘
```

### Production Requirements & Checklist:
1. **Cloud KMS Provider Support**:
   - **AWS KMS**: Asymmetric Key Spec `RSA_2048` or `RSA_4096` with Key Usage `SIGN_VERIFY`, Algorithm `RSASSA_PKCS1_V1_5_SHA_256`.
   - **Google Cloud KMS**: Purpose `ASYMMETRIC_SIGN`, Algorithm `RSA_SIGN_PKCS1_2048_SHA256` or `RSA_SIGN_PSS_2048_SHA256`.
   - **HashiCorp Vault Transit Engine**: Asymmetric RSA-2048/4096 key with sign/verify API.
2. **Least Privilege IAM**:
   - The API server role requires only `kms:Sign` and `kms:GetPublicKey` permissions for the specific clinical key ring.
   - `kms:DestroyKey` and `kms:ScheduleKeyDeletion` permissions are strictly restricted to organization security officers.
3. **Key Rotation & Versioning**:
   - Signing keys must be rotated annually or upon practitioner credential changes.
   - Each signature metadata records the Key Version Identifier (`keyVersion: 'projects/.../cryptoKeys/.../versions/1'`) so historical document signatures remain valid and verifiable throughout their retention period.
4. **Audit Logging & Tamper Evidence**:
   - Every invocation of the signing API triggers a tamper-evident CloudTrail / Cloud Audit log recording the principal, timestamp, source IP, and hash.

---

## 5. Verification Mechanism
To verify an issued document without trusting database state:
1. Retrieve canonical document payload bytes.
2. Compute `SHA-256(canonicalBytes)`.
3. Check `computedHash === document.fileHash`.
4. Retrieve issuer public key from `User.publicKeyPem`.
5. Verify RSA signature:
   ```typescript
   const verifier = crypto.createVerify('SHA256');
   verifier.update(canonicalBytes);
   const isValid = verifier.verify(publicKeyPem, signatureBase64, 'base64');
   ```
6. Compare hash against blockchain anchoring smart contract.
