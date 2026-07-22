# Auth Testing Playbook (Emergent Google Auth)

## Setup Test User & Session in MongoDB
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'customer',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## API Tests
```bash
curl -X GET "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN"
curl -X GET "$BASE/api/products"
```

## Browser Testing (Playwright)
```python
await page.context.add_cookies([{
  "name": "session_token",
  "value": SESSION_TOKEN,
  "domain": DOMAIN,
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None"
}])
```

## Success Indicators
- /api/auth/me returns user data
- Dashboard loads without redirect

## Failure Indicators
- 401 on /api/auth/me
- Redirect to /login
