# Branding & Final Checking – Transfer by StyleCode/Brand (Frontend Sync)

## Summary

Branding and Final Checking floors now support **transfer breakdown by styleCode and brand**. Instead of sending a single quantity, the frontend can send an array of `{ transferred, styleCode, brand }` for each transfer.

---

## 1. Transfer API (Branding → Final Checking, Final Checking → Warehouse)

**Endpoint:** `POST /v1/production/floors/:floor/transfer/:orderId/:articleId`

**Floors:** `Branding`, `Final Checking`

### Request body (new fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transferItems` | `Array` | Optional | Breakdown by styleCode/brand. Use for Branding/Final Checking. |
| `transferItems[].transferred` | `number` | Yes | Quantity for this styleCode/brand |
| `transferItems[].styleCode` | `string` | Optional | Style code |
| `transferItems[].brand` | `string` | Optional | Brand name |
| `quantity` | `number` | Optional | Legacy: single quantity (used when `transferItems` not provided) |

### Example – Branding transfer with breakdown

```json
{
  "userId": "user_id_here",
  "floorSupervisorId": "supervisor_id_here",
  "transferItems": [
    { "transferred": 200, "styleCode": "ABC123", "brand": "Nike" },
    { "transferred": 200, "styleCode": "XYZ456", "brand": "Puma" },
    { "transferred": 100, "styleCode": "DEF789", "brand": "Adidas" }
  ],
  "remarks": "Optional remarks"
}
```

- Total quantity = 500 (sum of `transferred`)
- Must not exceed transferable quantity on the floor

### Example – Legacy (unchanged)

```json
{
  "userId": "user_id_here",
  "floorSupervisorId": "supervisor_id_here",
  "quantity": 500
}
```

---

## 2. Container Accept / Receive API (Final Checking, Branding)

**Endpoint:** `PATCH /v1/production/articles/:articleId/floor-received`

Used when a container is accepted on the receiving floor (Branding or Final Checking).

### Request body (new fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receivedTransferItems` | `Array` | Optional | Breakdown by styleCode/brand when receiving |
| `receivedTransferItems[].transferred` | `number` | Yes | Quantity received for this styleCode/brand |
| `receivedTransferItems[].styleCode` | `string` | Optional | Style code |
| `receivedTransferItems[].brand` | `string` | Optional | Brand name |
| `receivedData` | `object` | Optional | `receivedStatusFromPreviousFloor`, `receivedInContainerId`, `receivedTimestamp` |
| `quantity` | `number` | Optional | Legacy: single quantity |

### Example – Receive with breakdown (Final Checking from Branding)

```json
{
  "floor": "Final Checking",
  "receivedTransferItems": [
    { "transferred": 200, "styleCode": "ABC123", "brand": "Nike" },
    { "transferred": 200, "styleCode": "XYZ456", "brand": "Puma" },
    { "transferred": 100, "styleCode": "DEF789", "brand": "Adidas" }
  ],
  "receivedData": {
    "receivedStatusFromPreviousFloor": "Transferred from Branding",
    "receivedInContainerId": "container_id_here",
    "receivedTimestamp": "2025-03-16T10:00:00.000Z"
  }
}
```

- Total received = 500 (sum of `transferred`)
- `quantity` is derived from `receivedTransferItems`; do not send `quantity` separately when using `receivedTransferItems`

---

## 3. Article response – new fields

### Branding floor

```json
{
  "floorQuantities": {
    "branding": {
      "received": 500,
      "completed": 500,
      "remaining": 0,
      "transferred": 500,
      "transferredData": [
        { "transferred": 200, "styleCode": "ABC123", "brand": "Nike" },
        { "transferred": 200, "styleCode": "XYZ456", "brand": "Puma" },
        { "transferred": 100, "styleCode": "DEF789", "brand": "Adidas" }
      ],
      "receivedData": [
        {
          "receivedStatusFromPreviousFloor": "...",
          "receivedInContainerId": "...",
          "receivedTimestamp": "...",
          "transferred": 200,
          "styleCode": "ABC123",
          "brand": "Nike"
        }
      ]
    }
  }
}
```

### Final Checking floor

```json
{
  "floorQuantities": {
    "finalChecking": {
      "received": 500,
      "completed": 0,
      "remaining": 500,
      "transferred": 0,
      "transferredData": [],
      "receivedData": [
        {
          "receivedStatusFromPreviousFloor": "...",
          "receivedInContainerId": "...",
          "receivedTimestamp": "...",
          "transferred": 200,
          "styleCode": "ABC123",
          "brand": "Nike"
        }
      ]
    }
  }
}
```

---

## 4. Flow

1. **Secondary Checking → Branding**  
   Branding receives combined quantity (unchanged).

2. **Branding → Final Checking**  
   - Transfer: send `transferItems` with `{ transferred, styleCode, brand }` per line.  
   - Stored in `branding.transferredData`.

3. **Container accept on Final Checking**  
   - Receive: send `receivedTransferItems` with same breakdown.  
   - Stored in `finalChecking.receivedData` with `transferred`, `styleCode`, `brand`.

4. **Final Checking → Warehouse**  
   - Transfer: send `transferItems` with breakdown.  
   - Stored in `finalChecking.transferredData`.

---

## 5. Backward compatibility

- `quantity` still works for Branding and Final Checking when `transferItems` is not sent.
- `receivedData` + `quantity` still works for container accept when `receivedTransferItems` is not sent.
- Existing articles without `transferredData` or extended `receivedData` continue to work; new fields default to `[]` or `0`.
