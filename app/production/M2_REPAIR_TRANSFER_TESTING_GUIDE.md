# M2 Repair Transfer - Testing Guide

## How to Test the M2 Repair Transfer Feature

### Prerequisites
1. You need an article with M2 quantity on one of these floors:
   - **Checking** floor
   - **Secondary Checking** floor  
   - **Final Checking** floor

### Step-by-Step Testing

#### 1. **Navigate to a Checking Floor**
   - Go to `/production/floor-supervisor/checking`
   - Or `/production/floor-supervisor/secondary-checking`
   - Or `/production/floor-supervisor/final-checking`

#### 2. **Find an Article with M2 Quantity**
   - Look for an order with articles that have M2 (repairable) items
   - Click **"Update"** button on an order

#### 3. **Locate the M2 Status Card**
   - In the update modal, scroll to the **"Step 4B: Article-wise Checked Quantities"** section
   - Under **"M2 - Needs Repair"** field, you'll see a yellow card showing:
     - **Total M2**: Total repairable items
     - **Sent for Repair**: Already transferred items
     - **Available**: Items available for transfer

#### 4. **Click "Send M2 for Repair" Button**
   - The button appears when `Available > 0`
   - Click the button to open the repair transfer modal

#### 5. **Review the Transfer Flow**
   - The modal shows a clear visual flow:
     ```
     [From Floor: Checking] → [To Floor: Linking]
     ```
   - You'll see:
     - **From Floor**: Current checking floor (Checking/Secondary Checking/Final Checking)
     - **To Floor**: Previous floor where items will be sent for repair
     - **Available M2**: How many items you can transfer

#### 6. **Enter Transfer Details**
   - **Quantity**: Enter how many M2 items to transfer (defaults to all available)
   - **Remarks**: Optional notes about the repair
   - Click **"Send for Repair"**

#### 7. **Verify Success**
   - You'll see a success toast message:
     ```
     ✅ Successfully transferred X M2 items from Checking to Linking for repair
     ```
   - Then another message:
     ```
     📋 Check Linking floor - X repair items added to received quantity
     ```

#### 8. **Check the Results**
   - **On Current Floor**:
     - M2 Status Card will update:
       - **Sent for Repair** increases by transferred amount
       - **Available** decreases by transferred amount
   - **On Previous Floor**:
     - Navigate to the previous floor (e.g., Linking floor)
     - The **received** quantity should increase by the transferred amount
     - These items will go through the process flow again

### Example Test Case

Based on your data:
- **Article**: A584
- **Checking Floor**: Has 7 M2 items available (`m2Remaining: 7`)
- **Previous Floor**: Linking (since linkingType is "Rosso Linking")

**Test Steps:**
1. Go to Checking floor supervisor page
2. Find order ORD-000001
3. Click "Update"
4. You'll see M2 Status Card showing:
   - Total M2: 7
   - Sent for Repair: 0
   - Available: 7
5. Click "Send M2 for Repair"
6. Modal shows: `Checking → Linking`
7. Enter quantity (e.g., 5) and click "Send for Repair"
8. After success:
   - Checking floor: `m2Transferred` becomes 5, `m2Remaining` becomes 2
   - Linking floor: `received` increases by 5

### Troubleshooting

**Q: I don't see the "Send M2 for Repair" button**
- Check if `m2Remaining > 0` in the M2 Status Card
- Make sure you're on a checking floor (Checking/Secondary Checking/Final Checking)

**Q: The modal doesn't show the correct previous floor**
- The previous floor is determined by the article's `linkingType`
- For "Rosso Linking" or "Hand Linking": Previous floor is "Linking"
- For "Auto Linking": Previous floor is "Knitting" (Linking is skipped)

**Q: After transfer, I don't see changes**
- Refresh the page or click "Refresh" button
- Check the previous floor's received quantity
- Look at the article logs to see the transfer entry

### Visual Indicators

**Before Transfer:**
```
M2 Repairable Items
├─ Total M2: 7
├─ Sent for Repair: 0
└─ Available: 7
[Send M2 for Repair Button]
```

**After Transfer (5 items):**
```
M2 Repairable Items
├─ Total M2: 7
├─ Sent for Repair: 5  ← Updated
└─ Available: 2        ← Updated
[Send M2 for Repair Button] (still visible if > 0)
```

### API Endpoint

The feature calls:
```
POST /api/v1/production/floors/{floor}/repair/{orderId}/articles/{articleId}
```

Request body:
```json
{
  "quantity": 5,
  "remarks": "Items need repair on linking floor"
}
```

### Expected Backend Response

```json
{
  "success": true,
  "data": {
    "article": { /* updated article */ },
    "repairTransferDetails": {
      "fromFloor": "Checking",
      "toFloor": "Linking",
      "quantity": 5,
      "m2Remaining": 2,
      "previousFloorReceived": 15,
      "message": "5 repairable items transferred from Checking to Linking for repair"
    }
  }
}
```
