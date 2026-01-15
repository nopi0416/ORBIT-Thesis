# Frontend-Backend Integration Testing Guide

## Quick Start - 5 Minutes

### Step 1: Start the Backend (Terminal 1)
```bash
cd orbit-backend
npm run dev
# Should see: Server running on http://localhost:3001
```

### Step 2: Start the Frontend (Terminal 2)
```bash
cd orbit-frontend
npm run dev
# Should see: VITE v... ready in ... ms
# Local: http://localhost:5173
```

### Step 3: Open Browser
1. Go to `http://localhost:5173`
2. Login with demo credentials (if prompted)
3. Navigate to "Budget Configuration" page

---

## Test 1: Load Configuration List ✅

### Expected Behavior
1. Loading spinner appears for 1-2 seconds
2. Configurations from database load
3. List displays with filters

### How to Test
1. Click "Configuration List" tab
2. Watch for loading spinner
3. **Should see**: Error message OR list of configurations

### If Error
- Check backend is running
- Click "Retry" button
- Check browser console (F12) for error details

---

## Test 2: Create New Configuration ✅

### Expected Behavior
1. Form accepts all input
2. Submit button shows loading state
3. Success message appears
4. Form resets
5. New configuration appears in list

### How to Test
1. Click "Create Configuration" tab
2. **Step 1**: Fill in:
   - Budget Name: "Test Budget Q1 2025"
   - Period: "Quarterly"
   - Min Limit: "1000"
   - Max Limit: "10000"
   - Enable Budget Control: Check
   - Budget Limit: "50000"
3. Click "Next"

4. **Step 2**: Fill in:
   - Country: "Philippines"
   - Site Location: "Metro Manila"
   - Client: "PLDT"
   - OU: "IT Department"
5. Click "Next"

6. **Step 3**: Select:
   - Tenure Groups: "0-6 Months", "6-12 Months"
   - L1 Primary: "John Smith"
   - L1 Backup: "Sarah Jones"
   - L2 Primary: "Michael Johnson"
   - L2 Backup: "Emily Davis"
   - L3 Primary: "David Brown"
   - L3 Backup: "Kevin Wong"
7. Click "Next"

8. **Step 4**: Review all settings
   - Click "Create Configuration"
   - **Expected**: Loading spinner → Success message → Form resets

### Verify in Database
```bash
# In backend terminal or database client
SELECT * FROM budget_configurations 
WHERE name = 'Test Budget Q1 2025' 
LIMIT 1;
```

---

## Test 3: Filter Configurations ✅

### Expected Behavior
List filters in real-time as you type/select filters

### How to Test
1. In Configuration List tab:
2. Try each filter:
   - **Search**: Type "Q1" → Should filter by name
   - **Geo**: Select "Philippines" → Should show only PH configs
   - **Location**: Select "Manila" → Should show only Manila configs
   - **Organization**: Select "PLDT" → Should show only PLDT configs
3. **Expected**: List updates instantly with filtered results

---

## Test 4: View Configuration Details ✅

### Expected Behavior
Modal opens with full configuration details

### How to Test
1. In Configuration List tab
2. Click on any configuration card
3. Modal opens with 3 tabs:
   - **Details**: Configuration info
   - **History**: Budget usage table
   - **Logs**: Request history table
4. Click through tabs
5. Close modal (X button)

---

## Test 5: Error Handling ✅

### Scenario 1: Backend Down
1. Stop backend server (Ctrl+C in backend terminal)
2. In Configuration List tab, click "Retry" or refresh
3. **Expected**: Error message with "Retry" button
4. Start backend again
5. Click "Retry"
6. **Expected**: Configurations load successfully

### Scenario 2: Invalid Form Data
1. Click "Create Configuration" tab
2. Leave Budget Name empty
3. Try to create
4. **Expected**: Form validates or API returns error
5. **Should see**: Error message at top of form

### Scenario 3: Network Error
1. Open browser DevTools (F12)
2. Go to Network tab
3. Check offline mode
4. Try to load configurations
5. **Expected**: Error message displays
6. Uncheck offline mode
7. Click "Retry"
8. **Expected**: Works normally

---

## Test 6: UI Responsiveness ✅

### Expected Behavior
- Submit button disabled while loading
- No duplicate submissions
- Smooth loading state transitions
- Error messages are clear and helpful

### How to Test
1. Start creating a configuration
2. Fill Step 1-3 quickly
3. Click "Create" button
4. **Expected**: Button shows "Creating..." with spinner
5. Try clicking again
6. **Expected**: Nothing happens (button disabled)
7. Wait for response
8. **Expected**: Success message or error message

---

## API Response Verification

### Create Configuration Response
```json
{
  "id": "uuid-string",
  "name": "Test Budget Q1 2025",
  "period": "quarterly",
  "created_by": "user-id",
  "created_at": "2025-01-05T10:00:00Z",
  "min_limit": 1000,
  "max_limit": 10000,
  "budget_control_enabled": true,
  "budget_control_limit": 50000,
  ...
}
```

### List Configurations Response
```json
[
  {
    "id": "uuid-1",
    "name": "Configuration 1",
    ...
  },
  {
    "id": "uuid-2",
    "name": "Configuration 2",
    ...
  }
]
```

---

## Debug Checklist

### Before Testing
- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:5173`
- [ ] No errors in backend console
- [ ] No errors in frontend console (F12)
- [ ] User is logged in

### During Testing
- [ ] Check browser console (F12) for errors
- [ ] Check Network tab (F12) to see API calls
- [ ] Check backend logs for error messages
- [ ] Verify database has created records

### API Request Examples
**Create Configuration Request:**
```
POST http://localhost:3001/api/budget-configurations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Test Budget",
  "period": "quarterly",
  "countries": ["ph"],
  "locations": ["manila"],
  ...
}
```

**Get Configurations Request:**
```
GET http://localhost:3001/api/budget-configurations
Authorization: Bearer <token>
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Configurations not loading | Check backend is running on port 3001 |
| "Cannot read property 'token'" | Ensure user is logged in |
| Form submit does nothing | Check browser console for error messages |
| Success message appears but config not in list | Refresh page or wait a moment |
| CORS error | Backend CORS config needs to allow frontend URL |
| "401 Unauthorized" | Token is invalid or expired, re-login |

---

## Performance Metrics

### Expected Load Times
- **Load Configuration List**: < 2 seconds
- **Create Configuration**: < 3 seconds (including form validation)
- **Filter update**: < 200ms
- **View details modal**: Instant (data already loaded)

---

## Test Data Available

The backend includes test data with these configurations:
- Q1 2025 Performance Bonus
- Special Awards Program  
- Monthly Incentive Program

Test filters against these existing configurations first before creating new ones.

---

## Success Criteria

✅ **All tests passed when:**
1. Configurations load from database
2. Can create new configuration and it saves to DB
3. Can filter configurations in real-time
4. Can view configuration details
5. Error messages display correctly
6. Submit button shows loading state
7. Network errors handled gracefully
8. New configs appear in list immediately after creation

---

## Next Steps After Testing

1. [ ] Test edit functionality (when implemented)
2. [ ] Test delete functionality (when implemented)
3. [ ] Test with real user data
4. [ ] Load test with large number of configurations
5. [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
6. [ ] Test on mobile/tablet screens
7. [ ] Implement real toast notifications
8. [ ] Add form validation feedback
9. [ ] Implement pagination for large lists
10. [ ] Add sorting capabilities

---

## Contact

For integration issues:
1. Check this guide first
2. Review FRONTEND_API_INTEGRATION_GUIDE.md
3. Check browser console (F12) for errors
4. Check backend logs in terminal
5. Verify network connectivity
