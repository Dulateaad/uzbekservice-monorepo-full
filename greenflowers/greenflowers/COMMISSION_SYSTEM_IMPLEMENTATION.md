# Worker Commission/Bonus System Implementation

## Overview (Обзоры)

Реализована система расчёта бонусов/комиссий для сотрудников (**worker**) по грузовикам (фура) и городам доставки.

### Key Features (Ключевые особенности)

✅ **Strict 10-step formula** - точный расчёт по заданной формуле  
✅ **Truck + City grouping** - привязка к фура_id + city, не дате  
✅ **Backend-only calculations** - все расчёты на бэкенде, фронтенд только отображает  
✅ **Role-based access** - админ видит всех работников, worker видит только себя  
✅ **Edge cases handled** - V ≤ B → Result=0, деление на ноль обработано  
✅ **Analytics cards** - top 4 метрики (A, B, V, E)  
✅ **Sortable tables** - сортировка по G, D, Result  
✅ **UI parity** - **admin/shifts** и **employee/shifts** используют один код

---

## Database Schema

### New Migration: `003_add_truck_city_to_orders.sql`

```sql
ALTER TABLE orders
ADD COLUMN truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL;

ALTER TABLE orders
ADD COLUMN city VARCHAR(100);
```

**Indexes:**

- `idx_orders_truck_id` - для быстрого поиска по грузовику
- `idx_orders_city` - для быстрого поиска по городу
- `idx_orders_truck_city` - composite для фильтрации по truck+city

**Triggers:**

- `order_city_sync_insert` - автоматически копирует delivery_city → city при создании заказа
- `order_city_sync_update` - синхронизирует city при обновлении заказа

---

## Backend Implementation

### 1. Commission Calculator Service

**File:** `back/services/commission-calculator.js`

```javascript
class CommissionCalculator {
  constructor(pool) {
    this.pool = pool;
  }

  // Main: Calculate commission for truck + city
  async calculateTruckCityCommission(truckId, city, workerId = null)

  // For specific worker
  async calculateWorkerFuraPercent(truckId, city, workerId)

  // Get all truck+city combinations
  async getAllTruckCityCombinations()
}
```

### Formula Implementation

```javascript
// Step 1-2: Get data
const A = sum of order.total_amount for truck+city
const B = A * 0.9

// Step 3-4: Calculate earnings
const V = sum of shift_sales.sale_amount for truck+city
const E = V - B

// Edge case check
if (V <= B || V === 0) return Result = 0

// Step 5-10: For each worker
const G = worker's total sales (shift_sales.sale_amount)
const D = (G / totalWorkerSales) * 100  // Worker percentage
const ZH = D * 10  // Literal: Ж = D * 10
const U = E * (ZH / 100)  // Literal: У = E * (Ж / 100)
const I = V / 100  // Literal: И = V / 100
const L = G / I  // Literal: Л = G / И
const Result = U * (L / 100)  // Literal: Result = У * (Л / 100)
```

### 2. API Endpoints

**File:** `back/routes/commissions.js`

#### GET `/api/commissions/commission/truck/:truckId/:city`

Returns commission data for truck+city combo

- **Admin**: Sees all workers for this truck+city
- **Worker**: Sees own commission only (pass userId, role in query)

**Response:**

```json
{
  "success": true,
  "truckId": 1,
  "city": "Алматы",
  "analytics": {
    "A": 100000,
    "B": 90000,
    "V": 95000,
    "E": 5000
  },
  "workers": [
    {
      "worker_id": 2,
      "worker_name": "Иван Петров",
      "G": 30000,
      "D": 60,
      "ZH": 600,
      "U": 3000,
      "I": 950,
      "L": 31.58,
      "Result": 950.0
    }
  ]
}
```

#### GET `/api/commissions/commission/all`

Returns all truck+city combinations with summary

- **Admin only**

#### GET `/api/commissions/commission/worker/:workerId/:truckId/:city`

Get specific worker's commission

- **Authorization**: Admin only OR own userId with "worker" role

---

## Frontend Implementation

### 1. API Client Methods

**File:** `sdfg/lib/api-client.ts`

```typescript
async getCommissionByTruckCity(
  truckId: number,
  city: string,
  userId?: number,
  role?: string
): Promise<CommissionData>

async getAllCommissions(role?: string): Promise<{combinations: any[]}>

async getWorkerCommission(
  workerId: number,
  truckId: number,
  city: string,
  userId?: number,
  role?: string
): Promise<CommissionData>
```

### 2. Admin Page

**File:** `sdfg/app/admin/shifts/page.tsx` (kept for backward compatibility)  
**New:** `sdfg/app/admin/commissions/page.tsx`

**Features:**

- Dropdown selector для выбора truck+city
- Top analytics cards: A, B, V, E
- Worker table с сортировкой по G, D, Result (descending по умол.)
- Edge case warning при V ≤ B или V = 0

### 3. Employee Page

**File:** `sdfg/app/employee/shifts/page.tsx`

**Features:**

- Same UI as admin
- Shows only current worker's commission
- Must be role="worker"
- Redirect to login if not worker
- Displays 3 large cards: G (Продажи), D (%), Result (Комиссия)
- Includes formula explanation

---

## Data Flow

```
1. Order created
   ↓
2. Automatic trigger copies delivery_city → city
3. Order assigned to truck_id (if applicable)
   ↓
4. Shift created, shift_sales records jobs
   ↓
5. Admin/Worker requests commission data
   ↓
6. Backend queries:
   - orders WHERE truck_id = X AND city = Y AND status IN (...)
   - shift_sales for these orders
   - users for workers
   ↓
7. Calculator processes:
   - A = sum of goods
   - B = A * 0.9
   - V = sum of sales
   - E = V - B
   - For each worker: G, D, ZH, U, I, L, Result
   ↓
8. Returns JSON to frontend
   ↓
9. Frontend displays without any calculations
```

---

## Edge Cases

| Condition           | Result            | Reason                   |
| ------------------- | ----------------- | ------------------------ |
| V = 0               | Result = 0        | No sales = no commission |
| V ≤ B               | Result = 0        | No profit / Loss         |
| I = V / 100 = 0     | L = 0, Result = 0 | Prevent division by zero |
| No workers          | workers = []      | Empty array returned     |
| Worker has no sales | G = 0, Result = 0 | No contribution          |

---

## User Roles & Access Control

### Admin (role="admin")

- ✅ View **all** trucks in **/admin/commissions**
- ✅ Select any truck + city combo
- ✅ See all workers for selected truck+city
- ✅ Sort table by any column
- ✅ Access to old shift management in **/admin/shifts**

### Worker (role="worker")

- ✅ View own commissions in **/employee/shifts**
- ✅ Select truck + city to view personal commission
- ✅ See only themselves in results
- 🚫 Cannot see other workers' commissions
- 🚫 Cannot access /admin routes

### User (role="user")

- 🚫 No access to commission pages

---

## Testing the System

### 1. Run Database Migration

```bash
cd back
node run-migration-003.js
```

### 2. Seed Test Data (Optional)

```bash
# Example: Set truck_id for existing orders
UPDATE orders SET truck_id = 1, city = 'Алматы'
WHERE id IN (1, 2, 3) AND status IN ('confirmed', 'in_transit', 'delivered');
```

### 3. Test API Endpoints

```bash
# Get commission for truck 1, city "Алматы" (Admin view)
curl "http://localhost:5000/api/commissions/commission/truck/1/Алматы?role=admin"

# Get only own commission (Worker view)
curl "http://localhost:5000/api/commissions/commission/truck/1/Алматы?userId=2&role=worker"

# Get all truck+city combos
curl "http://localhost:5000/api/commissions/commission/all?role=admin"
```

### 4. Test Frontend

**Admin:**

- Navigate to http://localhost:3000/admin/commissions
- Select truck+city from dropdown
- Verify all workers appear sorted by Result descending
- Click column headers to re-sort

**Worker:**

- Login as worker (role="worker")
- Navigate to http://localhost:3000/employee/shifts
- Verify only own commission shows
- Check that G, D, Result match expected calculation

---

## Implementation Checklist

- [x] Database migration: truck_id, city columns + triggers + indexes
- [x] Backend calculator service with strict 10-step formula
- [x] API endpoints: /commission/truck/:truckId/:city and variants
- [x] API client methods: getCommissionByTruckCity, getAllCommissions, getWorkerCommission
- [x] Admin page: /admin/commissions with truck selector + table + sorting
- [x] Employee page: /employee/shifts with own commission display
- [x] Role-based access control (read-only endpoints with userId+role checks)
- [x] Edge case handling (V≤B, V=0, division by zero)
- [x] Analytics cards (A, B, V, E)
- [x] Sortable tables
- [ ] **NEXT: Run migrations, test with real data, final build**

---

## Files Modified/Created

### Backend

- ✅ `back/migrations/003_add_truck_city_to_orders.sql` - Migration file
- ✅ `back/run-migration-003.js` - Migration runner script
- ✅ `back/services/commission-calculator.js` - New calculator service
- ✅ `back/routes/commissions.js` - New API endpoints
- ✅ `back/index.js` - Added commissions route registration

### Frontend

- ✅ `sdfg/lib/api-client.ts` - Added 3 new methods for commissions
- ✅ `sdfg/app/admin/commissions/page.tsx` - New admin commissions page
- ✅ `sdfg/app/admin/shifts/page.tsx` - Kept for backward compatibility
- ✅ `sdfg/app/employee/shifts/page.tsx` - Updated worker shifts page

---

## Next Steps

1. **Run migration:**

   ```bash
   cd back
   node run-migration-003.js
   ```

2. **Build frontend:**

   ```bash
   cd sdfg
   npm run build
   ```

3. **Test the system:**
   - Admin: /admin/commissions
   - Worker: /employee/shifts
   - Check API responses with curl

4. **Verify calculations** with sample data:
   - Set truck_id, city on some orders
   - Create shift_sales records
   - Compare Result to manual formula calculation

5. **Deploy** when satisfied with testing

---

## Formula Reference (Literal Implementation)

**Russian variable names preserved:**

- A = total goods amount
- B = A \* 0.9
- V = total sales
- E = V - B
- G = worker sales
- D = (G / total_all_workers) \* 100
- Ж = D \* 10
- У = E \* (Ж / 100)
- И = V / 100
- Л = G / И
- Result = У \* (Л / 100)

**Edge cases:**

- If V ≤ B → Result = 0
- If V = 0 → Result = 0
- If I = 0 (И = 0) → Result = 0
