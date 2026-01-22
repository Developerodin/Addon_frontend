# Yarn Return - Endpoints Documentation

## Flow: Scan Cone Barcode → Input Data → Scan Storage Barcode

### 1. Scan Cone Barcode
**Endpoint:** `GET /yarn-management/yarn-cones/barcode/{barcode}`

**Location in Code:** `app/yarn-management/yarn-return/page.tsx` (lines 705-713)

**Request:**
```http
GET ${API_BASE_URL}/yarn-management/yarn-cones/barcode/{barcode}
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
```

**Response:** Cone details including:
- `_id` / `id`
- `barcode`
- `yarn` (object or string ID)
- `yarnName`
- `issueWeight`
- `returnStatus`
- `returnWeight`
- `transactionId`
- etc.

**Purpose:** Fetch cone information when scanning a cone barcode.

---

### 2. Validate Storage Rack Barcode
**Endpoint:** `GET /storage/slots/barcode/{rackBarcode}`

**Location in Code:** `app/yarn-management/yarn-return/page.tsx` (line 577)
- Called via: `storageSlotService.getSlotDetailsByBarcode(rackBarcode)`
- Service file: `shared/services/storageSlotService.ts` (line 196-200)

**Request:**
```http
GET ${API_BASE_URL}/storage/slots/barcode/{rackBarcode}
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
```

**Response:** `SlotDetailsResponse` including:
- `storageSlot`: Storage slot details
- `zoneType`: Zone type (must be "SHORT_TERM" or "ST")
- `zoneCode`: Zone code (must be "ST")
- `type`: "boxes" | "cones"
- `count`: Number of items
- `data`: Array of items in slot

**Purpose:** Validate that the scanned rack barcode is a valid short-term storage rack.

**Validation Logic:**
- Checks if `zoneType === "SHORT_TERM"` OR `zoneType === "ST"` OR `zoneCode === "ST"`
- Throws error if not a short-term storage rack

---

### 3. Update Cone with Storage Location
**Endpoint:** `PATCH /yarn-management/yarn-cones/{coneId}`

**Location in Code:** `app/yarn-management/yarn-return/page.tsx` (line 609)
- Called via: `yarnConeService.updateYarnCone(coneId, { coneStorageId: rackBarcode })`
- Service file: `shared/services/yarnConeService.ts` (line 128-141)

**Request:**
```http
PATCH ${API_BASE_URL}/yarn-management/yarn-cones/{coneId}
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body:
{
  "coneStorageId": "{rackBarcode}"
}
```

**Response:** Updated `YarnCone` object

**Purpose:** Store the rack barcode in the cone's `coneStorageId` field to track where the cone is stored.

---

## Complete Flow Summary

1. **User scans cone barcode**
   - → `GET /yarn-management/yarn-cones/barcode/{barcode}`
   - Validates cone exists and is not already returned
   - Stores cone data in state

2. **User inputs transaction data**
   - Number of cones, total weight, tear weight, etc.
   - Data stored in `transactionForm` state

3. **User scans storage rack barcode**
   - → `GET /storage/slots/barcode/{rackBarcode}`
   - Validates rack is short-term storage (ST zone)
   - → `PATCH /yarn-management/yarn-cones/{coneId}`
   - Updates cone with `coneStorageId = rackBarcode`

4. **After all cones scanned and stored**
   - Opens return transaction modal
   - User submits return transaction
   - Creates return transactions via `POST /yarn-management/yarn-transactions`

---

## API Base URL
From `shared/data/utilities/api.ts`:
- Development: `http://localhost:3003/v1`
- Production: (commented out) `https://addon-api.theodin.in/v1`

---

## Notes
- Both endpoints require authentication via Bearer token
- Token is retrieved from cookies (`accessToken`) or localStorage (`token`)
- The storage rack must be a short-term storage (ST zone) rack
- Multiple cones can be scanned and stored before submitting the return transaction
