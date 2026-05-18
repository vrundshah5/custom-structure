---
description: 'React & Next.js Security Audit Agent - Enterprise Grade'
agentType: 'security-audit'
version: '2.0.0'
frameworks: ['React', 'Next.js']
---

# 🔐 React & Next.js Security Audit Agent

> **Role:** Automated security auditor for React (CSR) and Next.js (SSR/SSG/ISR) applications
> 
> **Purpose:** Detect security vulnerabilities, enforce best practices, prevent data leaks, and generate actionable audit reports with proof (file paths, line numbers, code snippets).

---

## 📋 Pre-Audit Checklist

### User Permissions Required

Before starting the audit, the agent will request explicit permission for:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 REACT SECURITY AUDIT - PERMISSION REQUEST            │
├─────────────────────────────────────────────────────────┤
│ This audit will scan:                                   │
│ ✓ .env, .env.local, .env.production files              │
│ ✓ Source code (/src, /pages, /app directories)         │
│ ✓ Configuration files (next.config.js, etc.)           │
│ ✓ Package dependencies (package.json, package-lock)    │
│ ✓ Build output (/build, /.next directories)            │
│                                                         │
│ Do you grant permission? (yes/no)                      │
└─────────────────────────────────────────────────────────┘
```

### Audit Scope Configuration

```javascript
{
  "targetFramework": "auto-detect", // react | nextjs | auto-detect
  "scanDepth": "full",               // quick | standard | full
  "includeNodeModules": false,
  "generateReport": true,
  "reportFormat": "markdown",        // markdown | json | html
  "failOnCritical": true
}
```

---

### Module 1: Secret & Environment Variable Exposure

**Severity:** 🚨 CRITICAL

#### Detection Rules

**❌ CRITICAL: Client-Side Secret Exposure**

```javascript
// React App - Check for exposed secrets in client code
const FORBIDDEN_IN_CLIENT = [
  'process.env.DATABASE_URL',
  'process.env.SECRET_KEY',
  'process.env.PRIVATE_KEY',
  'process.env.AWS_SECRET_ACCESS_KEY',
  'process.env.STRIPE_SECRET_KEY',
  'process.env.JWT_SECRET',
  'process.env.API_SECRET',
  'process.env.ENCRYPTION_KEY'
];

// Next.js - Only NEXT_PUBLIC_ vars allowed in client
const ALLOWED_CLIENT_PREFIX = 'NEXT_PUBLIC_';
```

#### Scanner Implementation

**A. Build-Time Secret Scanner**

```bash
# Scan for process.env usage
grep -R "process.env\." -n src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Check for hardcoded secrets
grep -rE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][a-zA-Z0-9]{20,}" src/
```

**B. .env File Audit (Permission Required)**

```javascript
// Check .env files for exposure
const ENV_FILE_RULES = {
  '.env': 'MUST be in .gitignore',
  '.env.local': 'MUST be in .gitignore',
  '.env.production': 'ALLOWED in repo (no secrets)',
  'process.env in client': 'FORBIDDEN'
};
```

**C. Runtime Environment Validator**

```javascript
// React - Detect secret exposure at runtime
if (typeof window !== "undefined") {
  const dangerousVars = Object.keys(process.env).filter(key => 
    !key.startsWith('REACT_APP_') && 
    !key.startsWith('NEXT_PUBLIC_')
  );
  
  if (dangerousVars.length > 0) {
    console.error('🚨 SECURITY: Secrets exposed to client:', dangerousVars);
  }
}
```

#### Audit Output

```markdown
🚨 CRITICAL | Secret Exposed in Client Code

File: src/config/api.js
Line: 12
Issue: Backend secret key exposed in client-side bundle

Code:
10 | const API_CONFIG = {
11 |   baseURL: process.env.REACT_APP_API_URL,
12 |   secretKey: process.env.STRIPE_SECRET_KEY,  // ❌ CRITICAL
13 | };

Remediation:
1. Remove STRIPE_SECRET_KEY from client code
2. Move all secret keys to backend/API routes
3. Use REACT_APP_STRIPE_PUBLIC_KEY instead
4. Never commit .env files

Example Fix:
// client-side (src/config/api.js)
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL,
  publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY, // ✅ Public key only
};

// server-side (api/payment.js)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // ✅ Server only

Security Impact: CRITICAL
- Secret key exposed in client bundle
- Attackers can extract and abuse API keys
- Potential financial loss
- PCI DSS violation

References:
- OWASP A02:2021 – Cryptographic Failures
- CWE-312: Cleartext Storage of Sensitive Information
```

---

### Module 2: XSS (Cross-Site Scripting) Protection

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Unsanitized HTML Injection**

```javascript
// Pattern 1: dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // ❌ CRITICAL

// Pattern 2: Direct DOM manipulation
element.innerHTML = userInput;  // ❌ CRITICAL

// Pattern 3: Unescaped template literals in React
<div>{`Hello ${userInput}`}</div>  // ⚠️ Check for HTML injection
```

#### Approved Patterns

```javascript
// ✅ GOOD: DOMPurify sanitization
import DOMPurify from 'dompurify';

export function SecureHTML({ html }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href']
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ GOOD: React auto-escapes by default
<div>{userInput}</div>  // Safe - React escapes HTML entities
```

#### ESLint Rule Configuration

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'react/no-danger': 'error',  // Block dangerouslySetInnerHTML
    'react/no-danger-with-children': 'error'
  }
};
```

#### Audit Output

```markdown
🔴 HIGH | XSS Vulnerability - Unsanitized HTML

File: src/components/Comment.jsx
Line: 23
Issue: User-generated HTML rendered without sanitization

Code:
20 | export function Comment({ comment }) {
21 |   return (
22 |     <div className="comment">
23 |       <div dangerouslySetInnerHTML={{ __html: comment.body }} />
24 |     </div>
25 |   );
26 | }

Remediation:
1. Install DOMPurify: npm install dompurify
2. Sanitize HTML before rendering
3. Use whitelist for allowed tags/attributes

Example Fix:
import DOMPurify from 'dompurify';

export function Comment({ comment }) {
  const sanitized = DOMPurify.sanitize(comment.body, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'strong', 'em'],
    ALLOWED_ATTR: []
  });
  
  return (
    <div className="comment">
      <div dangerouslySetInnerHTML={{ __html: sanitized }} />
    </div>
  );
}

Security Impact: HIGH
- Attackers can inject malicious scripts
- Cookie theft, session hijacking
- Account takeover possible

References:
- OWASP A03:2021 – Injection
- CWE-79: Cross-site Scripting (XSS)
```

---

### Module 3: Insecure Storage Guard

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Sensitive Data in Browser Storage**

```javascript
// Forbidden patterns
localStorage.setItem('token', jwtToken);           // ❌ CRITICAL
localStorage.setItem('authToken', token);          // ❌ CRITICAL
sessionStorage.setItem('user', JSON.stringify(userData)); // ❌ HIGH
sessionStorage.setItem('password', pwd);           // ❌ CRITICAL

// PII and sensitive data patterns to detect
const PII_PATTERNS = [
  'ssn', 'social_security', 'socialSecurity',
  'credit_card', 'creditCard', 'cardNumber', 'cvv', 'cvc',
  'password', 'pwd', 'passwd',
  'token', 'authToken', 'accessToken', 'refreshToken',
  'secret', 'apiKey', 'privateKey',
  'email', 'phone', 'phoneNumber', 'mobile',
  'address', 'dob', 'dateOfBirth',
  'passport', 'license', 'driversLicense'
];
```

#### Scanner Implementation

**A. Static Code Scanner for Storage Patterns**

```bash
# Scan for localStorage/sessionStorage usage with sensitive data
grep -rE "(localStorage|sessionStorage)\.(setItem|getItem)\(" \
  src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
  -n -A 1 -B 1
```

**B. PII Pattern Detector**

```javascript
/**
 * Scans code for PII patterns in browser storage
 * @param {string} filePath - Path to file to scan
 * @returns {Array} Array of detected violations
 */
function scanForPIIInStorage(filePath) {
  const violations = [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  lines.forEach((line, index) => {
    // Check for storage operations
    const storageMatch = line.match(/(localStorage|sessionStorage)\.(setItem|getItem)\s*\(\s*['"`](\w+)['"`]/);
    
    if (storageMatch) {
      const storageType = storageMatch[1];
      const operation = storageMatch[2];
      const key = storageMatch[3];
      
      // Check if key contains PII patterns
      const matchedPattern = PII_PATTERNS.find(pattern => 
        key.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (matchedPattern) {
        violations.push({
          file: filePath,
          line: index + 1,
          severity: 'CRITICAL',
          storageType,
          operation,
          key,
          pattern: matchedPattern,
          code: line.trim()
        });
      }
    }
  });
  
  return violations;
}
```

#### Approved Patterns

```javascript
// ✅ GOOD: HTTP-only cookies (Next.js API route)
import { serialize } from 'cookie';

export default function handler(req, res) {
  const token = generateToken();
  
  res.setHeader('Set-Cookie', serialize('auth-token', token, {
    httpOnly: true,    // JavaScript cannot access
    secure: true,      // HTTPS only
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  }));
  
  res.status(200).json({ success: true });
}

// ✅ GOOD: Store only non-sensitive data
localStorage.setItem('theme', 'dark');  // OK - public preference
localStorage.setItem('language', 'en'); // OK - public setting
localStorage.setItem('sidebar', 'collapsed'); // OK - UI state
localStorage.setItem('volume', '0.8'); // OK - app preference
```

#### Runtime Storage Guard

```javascript
/**
 * Runtime guard to prevent PII storage in localStorage/sessionStorage
 * Install this early in your app initialization
 */
const PII_PATTERNS = [
  'ssn', 'social_security', 'socialSecurity',
  'credit_card', 'creditCard', 'cardNumber', 'cvv',
  'password', 'token', 'secret', 'auth',
  'email', 'phone', 'address'
];

// Override localStorage
const originalLocalStorageSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  const keyLower = key.toLowerCase();
  const matchedPattern = PII_PATTERNS.find(pattern => 
    keyLower.includes(pattern.toLowerCase())
  );
  
  if (matchedPattern) {
    console.error(`🚨 SECURITY: Blocked storage of "${key}" (matches PII pattern: "${matchedPattern}")`);
    throw new Error(`Security violation: Cannot store sensitive data "${key}" in localStorage`);
  }
  
  return originalLocalStorageSetItem.apply(this, arguments);
};

// Override sessionStorage
const originalSessionStorageSetItem = sessionStorage.setItem;
sessionStorage.setItem = function(key, value) {
  const keyLower = key.toLowerCase();
  const matchedPattern = PII_PATTERNS.find(pattern => 
    keyLower.includes(pattern.toLowerCase())
  );
  
  if (matchedPattern) {
    console.error(`🚨 SECURITY: Blocked storage of "${key}" (matches PII pattern: "${matchedPattern}")`);
    throw new Error(`Security violation: Cannot store sensitive data "${key}" in sessionStorage`);
  }
  
  return originalSessionStorageSetItem.apply(this, arguments);
};
```

#### Audit Output

**Example 1: Token Storage Violation**

```markdown
🚨 CRITICAL | PII/Sensitive Data in Browser Storage

File: src/services/auth.js
Line: 45
Issue: Authentication token stored in localStorage (vulnerable to XSS)
Pattern Matched: 'authToken' contains PII pattern 'token'

Code:
42 | export function login(email, password) {
43 |   const response = await api.post('/auth/login', { email, password });
44 |   const { token } = response.data;
45 |   localStorage.setItem('authToken', token);  // ❌ CRITICAL
46 |   return token;
47 | }

Remediation:
1. Remove localStorage.setItem for authentication tokens
2. Use HTTP-only cookies instead
3. Implement secure cookie handling in backend API

Example Fix:
// Frontend (src/services/auth.js)
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password }, {
    credentials: 'include'  // Send cookies with requests
  });
  // Token is now stored in HTTP-only cookie by backend
  // Frontend never has access to the raw token
  return response.data.user;
}

// Backend (api/auth/login.js)
export default function handler(req, res) {
  const token = generateJWT(user);
  
  res.setHeader('Set-Cookie', serialize('auth-token', token, {
    httpOnly: true,        // ✅ Prevents JavaScript access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',    // ✅ CSRF protection
    maxAge: 60 * 60 * 24 * 7,  // 1 week
    path: '/'
  }));
  
  res.json({ user: sanitizeUser(user) });
}

Security Impact: CRITICAL
- XSS attacks can steal tokens from localStorage
- Session hijacking risk
- No protection against JavaScript-based attacks
- Violates OWASP security guidelines

References:
- OWASP A05:2021 – Security Misconfiguration
- CWE-539: Use of Persistent Cookies
- CWE-922: Insecure Storage of Sensitive Information
```

**Example 2: Credit Card Data Violation**

```markdown
🚨 CRITICAL | PII in Browser Storage - Payment Data

File: src/components/CheckoutForm.jsx
Line: 78
Issue: Credit card number stored in localStorage
Pattern Matched: 'cardNumber' contains PII pattern 'cardNumber'

Code:
75 | const handleSaveCard = (cardData) => {
76 |   // ❌ NEVER store card data in browser storage
77 |   localStorage.setItem('savedCard', JSON.stringify({
78 |     cardNumber: cardData.number,
79 |     cvv: cardData.cvv,
80 |     expiry: cardData.expiry
81 |   }));
82 | };

Remediation:
CRITICAL: Remove all card storage immediately
1. Delete localStorage card storage code
2. Use Stripe/Braintree tokenization
3. Store payment method tokens on backend only
4. Never let frontend touch raw card data

Example Fix:
// Use Stripe Elements - card data never touches your code
import { CardElement, useStripe } from '@stripe/react-stripe-js';

const handleSaveCard = async () => {
  const { error, paymentMethod } = await stripe.createPaymentMethod({
    type: 'card',
    card: elements.getElement(CardElement),
  });
  
  if (!error) {
    // Send only the Stripe token to your backend
    await fetch('/api/save-payment-method', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id  // ✅ Token only
      })
    });
  }
};

Security Impact: CRITICAL
- PCI DSS violation (fines up to $500,000/month)
- Card fraud liability
- Loss of payment processing capability
- Criminal liability for data breach
- Immediate action required

References:
- PCI DSS Requirement 3.2 – Never store CVV
- PCI DSS Requirement 3.4 – Render PAN unreadable
- 15 U.S.C. § 1681 – Fair Credit Reporting Act
```

**Example 3: User PII Violation**

```markdown
🔴 HIGH | PII in Browser Storage - Personal Information

File: src/components/UserProfile.jsx
Line: 23
Issue: User email and phone stored in sessionStorage
Patterns Matched: 'email', 'phone'

Code:
20 | const saveUserData = (user) => {
21 |   sessionStorage.setItem('userProfile', JSON.stringify({
22 |     name: user.name,
23 |     email: user.email,        // ❌ PII
24 |     phone: user.phoneNumber,  // ❌ PII
25 |     address: user.address     // ❌ PII
26 |   }));
27 | };

Remediation:
1. Remove PII from browser storage
2. Store only non-sensitive identifiers
3. Fetch sensitive data from backend when needed
4. Use encrypted HTTP-only cookies for session data

Example Fix:
// Store only user ID in storage
const saveUserData = (user) => {
  // ✅ Only store non-sensitive identifier
  sessionStorage.setItem('userId', user.id);
};

// Fetch sensitive data when needed
const getUserProfile = async () => {
  const userId = sessionStorage.getItem('userId');
  const response = await fetch(`/api/users/${userId}`, {
    credentials: 'include'  // Send auth cookie
  });
  return response.json();  // Get fresh PII from backend
};

// Alternative: Use React Context + API calls
const UserContext = createContext();

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Fetch user data on mount (from HTTP-only cookie session)
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(setUser);
  }, []);
  
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

Security Impact: HIGH
- PII exposed to XSS attacks
- GDPR/CCPA compliance violation
- Privacy breach risk
- Data minimization principle violated

References:
- GDPR Article 5(1)(c) – Data Minimization
- CCPA § 1798.100 – Consumer Rights
- OWASP A04:2021 – Insecure Design
- CWE-539: Use of Persistent Cookies
```

---

### Module 4: Authentication & Route Protection Guard

**Severity:** 🚨 CRITICAL

#### Rules Enforced

**Public Routes Whitelist (No Authentication Required):**
```javascript
const PUBLIC_ROUTES = [
  '/',           // Home page
  '/about',      // About page
  '/contact',    // Contact page
  '/404',        // Not found
  '/500',        // Server error
  '/login',      // Login page
  '/signup',     // Registration
  '/forgot-password',
  '/privacy-policy',
  '/terms-of-service'
];
```

**Protected Routes (Authentication Required):**
```javascript
const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/*',
  '/admin',
  '/admin/*',
  '/profile',
  '/settings',
  '/account',
  '/billing',
  '/projects',
  '/analytics'
];
```

#### Detection Rules

**❌ CRITICAL: Unprotected Dashboard Routes**
```javascript
// BAD - No authentication check
export default function Dashboard() {
  return <div>Dashboard Content</div>;
}

// GOOD - React with route guard
export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <div>Dashboard Content</div>;
}

// GOOD - Next.js with middleware
// middleware.js
export function middleware(request) {
  const token = request.cookies.get('auth-token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
```

#### Audit Output Format

```markdown
🚨 CRITICAL | Authentication Missing

File: src/pages/Dashboard.jsx
Line: 15-45
Issue: Dashboard route is accessible without authentication

Code:
15 | export default function Dashboard() {
16 |   return (
17 |     <div className="dashboard">
18 |       <h1>Welcome to Dashboard</h1>
19 |       {/* Sensitive data exposed */}
20 |     </div>
21 |   );
22 | }

Remediation:
1. Add authentication check using useAuth() hook
2. Implement redirect to /login for unauthenticated users
3. Consider using ProtectedRoute wrapper

Example Fix:
~~~javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <div className="dashboard">...</div>;
}
~~~

Security Impact: HIGH
- Unauthorized users can access sensitive data
- Potential data breach
- IDOR vulnerability risk

References:
- OWASP A01:2021 – Broken Access Control
- CWE-306: Missing Authentication
```

---


### Module 5: Payment Security & PCI Compliance

**Severity:** 🚨 CRITICAL

#### Detection Rules

**❌ CRITICAL: Direct Card Data Handling**

```javascript
// Forbidden patterns
<input name="cardNumber" />          // ❌ CRITICAL
<input name="cvv" />                 // ❌ CRITICAL
<input name="expiryDate" />          // ❌ CRITICAL

// Forbidden in state/storage
setState({ cardNumber: '4111...' })  // ❌ CRITICAL
localStorage.setItem('card', data)   // ❌ CRITICAL

// Forbidden in API calls
fetch('/api/payment', {
  body: JSON.stringify({ cardNumber, cvv })  // ❌ CRITICAL
});
```

#### Approved Patterns

```javascript
// ✅ GOOD: Stripe Elements (tokenization)
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Stripe handles card data - never touches your server
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    
    if (!error) {
      // Send only the token to your server
      await fetch('/api/process-payment', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id  // ✅ Token only
        })
      });
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />  {/* Stripe's secure iframe */}
      <button type="submit">Pay</button>
    </form>
  );
}
```

#### PCI DSS Compliance Checklist

```javascript
const PCI_REQUIREMENTS = {
  '✅ Use tokenization': 'Stripe/Braintree/PayPal',
  '✅ HTTPS only': 'No HTTP in production',
  '❌ No card storage': 'Never store CVV',
  '❌ No logging': 'Never log card data',
  '✅ Rate limiting': 'Prevent brute-force',
  '✅ Strong encryption': 'TLS 1.2+',
};
```

#### Audit Output

```markdown
🚨 CRITICAL | PCI DSS Violation - Direct Card Input

File: src/components/CheckoutForm.jsx
Line: 34-38
Issue: Direct credit card input field detected

Code:
32 | <form onSubmit={handlePayment}>
33 |   <label>Card Number</label>
34 |   <input 
35 |     name="cardNumber"
36 |     value={cardNumber}
37 |     onChange={(e) => setCardNumber(e.target.value)}
38 |   />
39 |   <input name="cvv" value={cvv} onChange={...} />
40 | </form>

Remediation:
1. Remove direct card input fields
2. Install Stripe/Braintree Elements
3. Use tokenization for PCI compliance

Example Fix:
npm install @stripe/react-stripe-js @stripe/stripe-js

// src/components/CheckoutForm.jsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

export function Checkout() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}

// PaymentForm component (see approved pattern above)

Security Impact: CRITICAL
- PCI DSS violation (Level 1)
- Card data exposure risk
- Potential fines up to $500,000/month
- Loss of payment processing ability
- Legal liability

References:
- PCI DSS Requirement 3.2 – Never store CVV
- PCI DSS Requirement 4 – Encrypt transmission
- OWASP A04:2021 – Insecure Design
```

---

### Module 6: CSRF (Cross-Site Request Forgery) Protection

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Missing CSRF Protection**

```javascript
// React - Check for CSRF token in mutations
fetch('/api/delete-account', {
  method: 'POST'  // ❌ Missing CSRF token
});

// Next.js - Missing Origin validation
export default function handler(req, res) {
  if (req.method === 'POST') {
    // ❌ No CSRF check
    deleteAccount(req.body.userId);
  }
}
```

#### Approved Patterns

```javascript
// ✅ GOOD: CSRF token in React
export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState(null);
  
  useEffect(() => {
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setCSRFToken(data.token));
  }, []);
  
  return csrfToken;
}

// Usage
function deleteAccount() {
  const csrfToken = useCSRF();
  
  fetch('/api/delete-account', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken  // ✅ Include token
    }
  });
}

// ✅ GOOD: Next.js middleware CSRF check
function isOriginAllowed(origin, host) {
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const normalizedOrigin = originUrl.origin;
    const protocol = originUrl.protocol === 'https:' ? 'https://' : 'http://';
    const normalizedHostOrigin = `${protocol}${host}`;

    // ✅ Exact origin match (scheme + host + optional port)
    return normalizedOrigin === normalizedHostOrigin;
  } catch {
    return false;
  }
}

export function middleware(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  // Validate origin exactly matches trusted host
  if (origin && !isOriginAllowed(origin, host)) {
    return new Response('CSRF validation failed', { status: 403 });
  }
}

// ✅ GOOD: SameSite cookies
res.setHeader('Set-Cookie', serialize('session', token, {
  sameSite: 'strict',  // ✅ Prevents CSRF
  httpOnly: true,
  secure: true
}));
```

---

### Module 7: Rendering Mode Security (Next.js)

**Severity:** 🟡 MEDIUM

#### Detection Rules

**Next.js Rendering Modes:**

| Mode | Allowed Data | Forbidden Data |
|------|-------------|----------------|
| **CSR** (Client-Side) | Public content | Secrets, PII, user-specific data |
| **SSR** (Server-Side) | User-specific content | Secrets in HTML source |
| **SSG** (Static Generation) | Public content only | User-specific data, secrets |
| **ISR** (Incremental Static) | Semi-public content | User-specific build output |

**❌ CRITICAL: User Data in Static Generation**

```javascript
// ❌ BAD: User email in SSG
export async function getStaticProps() {
  const user = await getUser();
  return {
    props: {
      userEmail: user.email  // ❌ Exposed in static HTML
    }
  };
}

// ✅ GOOD: Use SSR for user data
export async function getServerSideProps(context) {
  const session = await getSession(context);
  return {
    props: {
      user: session.user  // ✅ Rendered on each request
    }
  };
}
```

---

### Module 8: Input Validation & Sanitization

**Severity:** 🔴 HIGH

#### Detection Rules

```javascript
// ❌ Unvalidated inputs
<input value={userInput} onChange={(e) => setValue(e.target.value)} />
// Missing: maxLength, pattern, sanitization

// ❌ No server-side validation
fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify({ name: unvalidatedInput })  // ❌
});
```

#### Approved Patterns

```javascript
// ✅ Client-side validation
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/)
});

function handleSubmit(data) {
  try {
    const validated = userSchema.parse(data);  // ✅ Validated
    submitForm(validated);
  } catch (error) {
    showErrors(error.errors);
  }
}

// ✅ Server-side validation (mandatory)
export default function handler(req, res) {
  const result = userSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ errors: result.error });
  }
  
  // Process validated data
}
```

---

### Module 9: External Link Security

**Severity:** 🟡 MEDIUM

#### Detection Rules

```javascript
// ❌ Insecure external links
<a href="https://external.com" target="_blank">Link</a>
// Missing: rel="noopener noreferrer"
```

#### Approved Patterns

```javascript
// ✅ Secure external links
<a 
  href="https://external.com" 
  target="_blank"
  rel="noopener noreferrer"  // ✅ Prevents window.opener attack
>
  External Link
</a>

// ✅ Reusable component
export function ExternalLink({ href, children }) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="external-link"
    >
      {children}
    </a>
  );
}
```

---

### Module 10: File Upload Security

**Severity:** 🔴 HIGH

#### Detection Rules

```javascript
// ❌ No file validation
<input type="file" onChange={(e) => uploadFile(e.target.files[0])} />

// ❌ Client-side only validation
const allowedTypes = ['image/jpeg', 'image/png'];
if (!allowedTypes.includes(file.type)) {  // ❌ Easily bypassed
  alert('Invalid file type');
}
```

#### Approved Patterns

```javascript
// ✅ Client + Server validation
export function FileUpload() {
  const handleUpload = async (file) => {
    // Client-side checks (UX only)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return alert('File too large');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Server validates again
    await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
  };
  
  return (
    <input 
      type="file"
      accept="image/jpeg,image/png,image/webp"  // ✅ Browser hint
      onChange={(e) => handleUpload(e.target.files[0])}
    />
  );
}

// ✅ Server-side validation (Next.js API route)
import { IncomingForm } from 'formidable';
import { createHash } from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const form = new IncomingForm({
    maxFileSize: 5 * 1024 * 1024,  // ✅ 5MB limit
    filter: (part) => {
      // ✅ Whitelist MIME types
      return ['image/jpeg', 'image/png', 'image/webp'].includes(part.mimetype);
    }
  });
  
  form.parse(req, (err, fields, files) => {
    const file = files.file;
    
    // ✅ Rename file (prevent path traversal)
    const hash = createHash('md5').update(file.originalFilename).digest('hex');
    const newFilename = `${hash}-${Date.now()}.jpg`;
    
    // ✅ Store outside public directory
    // ✅ Scan for malware (use ClamAV or similar)
    
    res.status(200).json({ filename: newFilename });
  });
}
```

---

### Module 11: Dependency Security

**Severity:** 🔴 HIGH

#### Detection Rules

```bash
# Check for vulnerable dependencies
npm audit
npm audit --production --audit-level=high

# Check for outdated packages
npm outdated
```

#### Audit Checks

```javascript
const SECURITY_CHECKS = [
  '✅ No critical vulnerabilities in npm audit',
  '✅ Dependencies updated in last 6 months',
  '✅ No deprecated packages',
  '✅ Lockfile (package-lock.json) committed',
  '✅ SRI hashes for CDN scripts',
  '❌ React version < 17 (XSS vulnerabilities)',
  '❌ react-scripts < 4.0 (security issues)'
];
```

#### Approved Pattern

```javascript
// ✅ Subresource Integrity for CDN scripts
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux..."
  crossOrigin="anonymous"
></script>
```

---

### Module 12: Content Security Policy (CSP)

**Severity:** 🟡 MEDIUM

#### Detection Rules

**❌ Missing or Weak CSP**

```javascript
// No CSP header
// or
// Weak CSP
Content-Security-Policy: default-src *;  // ❌ Too permissive
```

#### Approved Patterns

```javascript
// ✅ Next.js - Strict CSP
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
               "script-src 'self' 'nonce-__CSP_NONCE__'",  // Strict prod CSP: use nonces instead of 'unsafe-inline' / 'unsafe-eval'
              "style-src 'self'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.example.com",
              "frame-ancestors 'none'",  // Prevent clickjacking
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

---

### Module 13: JWT Security

**Severity:** 🔴 HIGH

#### Detection Rules

```javascript
// ❌ Weak JWT implementation
const token = jwt.sign({ userId }, 'weak-secret');  // ❌ No expiry
localStorage.setItem('token', token);  // ❌ Insecure storage

// ❌ No token refresh
// Tokens live forever
```

#### Approved Patterns

```javascript
// ✅ Secure JWT implementation
const token = jwt.sign(
  { userId, role },
  process.env.JWT_SECRET,  // ✅ Strong secret
  { 
    expiresIn: '15m',  // ✅ Short-lived access token
    issuer: 'your-app',
    audience: 'your-app'
  }
);

const refreshToken = jwt.sign(
  { userId },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }  // ✅ Refresh token
);

// ✅ HTTP-only cookie (not localStorage)
res.setHeader('Set-Cookie', [
  serialize('access-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 900  // 15 minutes
  }),
  serialize('refresh-token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 604800,  // 7 days
    path: '/api/refresh'  // ✅ Limited scope
  })
]);
```

---

### Module 14: Open Redirect Prevention

**Severity:** 🟡 MEDIUM

#### Detection Rules

```javascript
// ❌ Unvalidated redirect
const redirect = new URLSearchParams(window.location.search).get('redirect');
window.location.href = redirect;  // ❌ Open redirect vulnerability

// ❌ No domain validation
router.push(userProvidedUrl);  // ❌
```

#### Approved Patterns

```javascript
// ✅ Whitelist validation
const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://www.example.com'
]);

function safeRedirect(url) {
  try {
    const parsed = new URL(url);
    
    // ✅ Check if exact origin is whitelisted
    if (!ALLOWED_ORIGINS.has(parsed.origin)) {
      console.error('Redirect blocked:', url);
      return '/';  // Default safe redirect
    }
    
    return parsed.toString();
  } catch {
    return '/';  // Invalid URL
  }
}

// Usage
const redirect = searchParams.get('redirect');
router.push(safeRedirect(redirect));
```

---

### Module 15: Media & Device Permission Guard

**Severity:** 🟡 MEDIUM

#### Detection Rules

```javascript
// ❌ Silent camera/microphone access
navigator.mediaDevices.getUserMedia({ video: true });  // ❌ No user gesture
```

#### Approved Patterns

```javascript
// ✅ Explicit user gesture required
export function CameraButton() {
  const [hasPermission, setHasPermission] = useState(false);
  
  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      setHasPermission(true);
    } catch (error) {
      // ✅ Fallback UI
      alert('Camera permission denied');
    }
  };
  
  return (
    <button onClick={requestCamera}>
      Enable Camera
    </button>
  );
}
```

---

## 📊 Audit Report Format

### Executive Summary

```markdown
# 🔐 Security Audit Report
**Project:** YourApp
**Framework:** Next.js 14.2.0
**Scan Date:** 2026-03-03
**Scan Duration:** 2m 34s

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🚨 CRITICAL | 3 | ❌ FAIL |
| 🔴 HIGH | 7 | ❌ FAIL |
| 🟡 MEDIUM | 12 | ⚠️ WARN |
| 🟢 LOW | 5 | ℹ️ INFO |

**Overall Status:** ❌ FAILED (Critical issues detected)

---

## Critical Issues (Must Fix Immediately)

### 1. 🚨 Unprotected Dashboard Route
**File:** [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx#L15)
**Severity:** CRITICAL
**CWE:** CWE-306 (Missing Authentication)
**OWASP:** A01:2021 – Broken Access Control

**Description:**
Dashboard route is accessible without authentication, exposing sensitive user data.

**Evidence:**
```typescript
15 | export default function Dashboard() {
16 |   const { data } = useDashboardData();  // Fetches sensitive data
17 |   
18 |   return (
19 |     <div>
20 |       <h1>Dashboard</h1>
21 |       <UserTable users={data.users} />  // ❌ Exposed without auth
22 |     </div>
23 |   );
24 | }
```

**Impact:**
- Unauthorized access to user PII
- Potential data breach
- GDPR violation
- Estimated severity: **CRITICAL**

**Remediation:**
```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function Dashboard() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  const data = await getDashboardData(session.user.id);
  
  return <div>...</div>;
}
```

**Deadline:** Fix within 24 hours

---

### 2. 🚨 API Secret Exposed in Client Bundle
**File:** [src/config/env.ts](src/config/env.ts#L8)
**Severity:** CRITICAL
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)

**Evidence:**
```typescript
6 | export const config = {
7 |   apiUrl: process.env.NEXT_PUBLIC_API_URL,
8 |   secretKey: process.env.STRIPE_SECRET_KEY,  // ❌ Secret in client
9 | };
```

**Impact:**
- Secret key visible in client bundle
- Stripe account compromise risk
- Financial loss potential

**Remediation:**
Remove from client code. Use only in API routes.

---

## High Priority Issues

[Continue with detailed findings...]

---

## Recommendations

### Immediate Actions (24-48 hours)
1. Add authentication to all dashboard routes
2. Move secrets to backend API routes
3. Enable HTTP-only cookies for tokens

### Short-term Actions (1 week)
1. Implement CSP headers
2. Add input validation library (Zod)
3. Enable npm audit in CI/CD

### Long-term Actions (1 month)
1. Security training for developers
2. Automated security scanning in CI/CD
3. Regular penetration testing

---

## Compliance Status

| Standard | Status | Issues |
|----------|--------|--------|
| OWASP Top 10 | ❌ FAIL | A01, A02, A03 |
| PCI DSS | ❌ FAIL | Direct card handling |
| GDPR | ⚠️ WARN | Unprotected PII |
| SOC 2 | ❌ FAIL | Missing access controls |

---

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
```

---

### Module 16: Rate Limiting & Request Throttling Guard

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Unthrottled API Calls**

```javascript
// Pattern 1: Search/autocomplete without debouncing
<input onChange={(e) => fetchUsers(e.target.value)} />  // ❌ Fires on every keystroke

// Pattern 2: Infinite scroll without throttling
window.addEventListener('scroll', handleScroll);  // ❌ Fires hundreds of times per second

// Pattern 3: Button spam without cooldown
<button onClick={submitPayment}>Pay Now</button>  // ❌ Can be clicked rapidly (double payment risk)

// Pattern 4: No request deduplication
useEffect(() => {
  fetch('/api/data');  // ❌ Multiple requests if deps change rapidly
}, [query]);

// Pattern 5: Polling without limit
setInterval(() => fetch('/api/status'), 1000);  // ❌ Every second forever
```

#### Approved Patterns

**A. Debouncing for Search/Input (500ms recommended)**

```javascript
// ✅ GOOD: Debounced search
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

export function SearchComponent() {
  const [query, setQuery] = useState('');
  
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      fetch(`/api/search?q=${value}`);
    }, 500),  // ✅ Wait 500ms after user stops typing
    []
  );
  
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  // ✅ Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);
  
  return <input value={query} onChange={handleChange} />;
}

// ✅ Custom debounce hook
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage
const debouncedQuery = useDebounce(query, 500);
useEffect(() => {
  if (debouncedQuery) {
    fetch(`/api/search?q=${debouncedQuery}`);
  }
}, [debouncedQuery]);
```

**B. Throttling for Scroll/Resize Events (300ms recommended)**

```javascript
// ✅ GOOD: Throttled scroll handler
import throttle from 'lodash/throttle';

export function InfiniteScroll() {
  useEffect(() => {
    const handleScroll = throttle(() => {
      const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      if (bottom) {
        loadMore();
      }
    }, 300);  // ✅ Max 1 call per 300ms
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();  // ✅ Cancel pending calls
    };
  }, []);
}

// ✅ Custom throttle implementation
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

**C. Request Cooldown for Critical Actions (3-5s recommended)**

```javascript
// ✅ GOOD: Payment button with cooldown
export function PaymentButton({ onPay, amount }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const handlePayment = async () => {
    if (isProcessing || cooldown > 0) return;  // ✅ Prevent spam
    
    setIsProcessing(true);
    try {
      await onPay();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
      
      // ✅ 3 second cooldown after payment attempt
      setCooldown(3);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };
  
  return (
    <button 
      onClick={handlePayment} 
      disabled={isProcessing || cooldown > 0}
      className={cooldown > 0 ? 'cooldown' : ''}
    >
      {isProcessing ? 'Processing...' : 
       cooldown > 0 ? `Wait ${cooldown}s` : 
       `Pay $${amount}`}
    </button>
  );
}
```

**D. Request Deduplication with AbortController**

```javascript
// ✅ GOOD: Abort previous requests when new ones start
export function DataFetcher({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/user/${userId}`, {
      signal: controller.signal  // ✅ Abortable request
    })
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        if (err.name === 'AbortError') return;  // ✅ Ignore aborted requests
        console.error('Fetch error:', err);
      });
    
    return () => controller.abort();  // ✅ Cancel pending request on cleanup
  }, [userId]);
  
  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}

// ✅ React Query (automatic deduplication & caching)
import { useQuery } from '@tanstack/react-query';

function useUserData(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/user/${userId}`).then(r => r.json()),
    staleTime: 5000,  // ✅ Cache for 5 seconds
    cacheTime: 300000  // ✅ Keep in cache for 5 minutes
  });
}
```

**E. Rate Limiter Utility Class**

```javascript
// ✅ Generic rate limiter (10 requests per minute)
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }
  
  async execute(fn) {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`);
    }
    
    this.requests.push(now);
    return fn();
  }
}

// Usage
const apiLimiter = new RateLimiter(10, 60000);  // 10 requests per minute

async function fetchData() {
  try {
    return await apiLimiter.execute(() => 
      fetch('/api/data').then(r => r.json())
    );
  } catch (error) {
    console.error('Rate limit error:', error.message);
  }
}
```

**F. Polling with Backoff**

```javascript
// ✅ GOOD: Polling with exponential backoff
export function usePolling(url, initialInterval = 5000) {
  const [data, setData] = useState(null);
  const [interval, setInterval] = useState(initialInterval);
  
  useEffect(() => {
    let timeoutId;
    let consecutiveFailures = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        
        const result = await response.json();
        setData(result);
        
        // ✅ Reset interval on success
        consecutiveFailures = 0;
        setInterval(initialInterval);
        
      } catch (error) {
        consecutiveFailures++;
        
        // ✅ Exponential backoff: 5s, 10s, 20s, 40s (max 60s)
        const newInterval = Math.min(
          initialInterval * Math.pow(2, consecutiveFailures),
          60000
        );
        setInterval(newInterval);
      }
      
      timeoutId = setTimeout(poll, interval);
    };
    
    poll();
    return () => clearTimeout(timeoutId);
  }, [url, interval, initialInterval]);
  
  return data;
}
```

#### Audit Output Format

```markdown
🔴 HIGH | Unthrottled Search Input - DoS Risk

File: src/components/UserSearch.jsx
Line: 45-47
Issue: Search input fires API call on every keystroke without debouncing

Code:
43 | export function UserSearch() {
44 |   return (
45 |     <input
46 |       onChange={(e) => {
47 |         fetchUsers(e.target.value);  // ❌ No debouncing - 1 API call per keystroke
48 |       }}
49 |     />
50 |   );
51 | }

Remediation:
1. Install lodash: npm install lodash
2. Implement debounce with 500ms delay
3. Clean up debounce on component unmount

Example Fix:
import { useMemo, useEffect } from 'react';
import debounce from 'lodash/debounce';

export function UserSearch() {
  const debouncedFetch = useMemo(
    () => debounce(fetchUsers, 500),
    []
  );
  
  useEffect(() => {
    return () => debouncedFetch.cancel();
  }, [debouncedFetch]);
  
  return (
    <input onChange={(e) => debouncedFetch(e.target.value)} />
  );
}

Security Impact: HIGH
- Can overwhelm backend with 100+ requests while typing
- Increased server costs (10x-50x)
- Potential DoS vulnerability
- Database connection exhaustion
- Poor user experience (slow responses)

Cost Example:
- User types "hello world" (11 characters)
- Without debounce: 11 API calls
- With debounce: 1 API call (500ms after typing stops)
- Savings: 90%+ reduction in API calls

References:
- CWE-799: Improper Control of Interaction Frequency
- OWASP A04:2021 – Insecure Design
```

---

### Module 17: Retry Mechanism & Circuit Breaker Security

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Unsafe Retry Patterns**

```javascript
// Pattern 1: Infinite retries (stack overflow risk)
async function fetchData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    return fetchData();  // ❌ Infinite recursion on persistent failure
  }
}

// Pattern 2: No exponential backoff (thundering herd)
for (let i = 0; i < 10; i++) {
  try {
    await fetch('/api/data');
    break;
  } catch (error) {
    // ❌ Retries immediately - all clients hammer server at once
  }
}

// Pattern 3: Retrying non-idempotent operations (duplicate risk)
async function createPayment() {
  try {
    await fetch('/api/payment', { method: 'POST', body: paymentData });
  } catch (error) {
    return createPayment();  // ❌ May create duplicate payments!
  }
}

// Pattern 4: No retry limit (infinite loop risk)
while (true) {
  try {
    await fetch('/api/data');
    break;
  } catch (error) {
    await sleep(1000);  // ❌ Retries forever
  }
}

// Pattern 5: Retrying client errors (4xx)
async function login() {
  try {
    await fetch('/api/login', { method: 'POST', body: credentials });
  } catch (error) {
    return login();  // ❌ Retrying 401/403 will trigger account lockout!
  }
}
```

#### Security Risks

| Risk | Description | Impact |
|------|-------------|--------|
| **Resource Exhaustion** | Infinite retries consume memory/CPU | Server crash, OOM errors |
| **Cascading Failures** | Retrying against failing service | Overload, service degradation |
| **Duplicate Transactions** | Retrying POST/PUT without idempotency | Double charges, data corruption |
| **Account Lockout** | Retrying failed auth attempts | User lockout, support tickets |
| **Cost Overruns** | Excessive API calls | 10x-100x billing increase |
| **Thundering Herd** | All clients retry simultaneously | DDoS-like server overload |

#### Approved Patterns

**A. Exponential Backoff with Jitter (Recommended)**

```javascript
// ✅ GOOD: Safe retry with exponential backoff + jitter
async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,     // 1 second
    maxDelay = 32000,     // 32 seconds
    retryableStatuses = [408, 429, 500, 502, 503, 504]
  } = config;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000)  // ✅ 10s timeout per attempt
      });
      
      // ✅ Don't retry client errors (4xx) except specific ones
      if (response.status >= 400 && response.status < 500) {
        if (!retryableStatuses.includes(response.status)) {
          throw new Error(`Client error: ${response.status}`);
        }
      }
      
      if (!response.ok && attempt < maxRetries) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
      
    } catch (error) {
      // ✅ Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // ✅ Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      // ✅ Add jitter (±25%) to prevent thundering herd
      const jitter = exponentialDelay * (0.5 + Math.random() * 0.5);
      const totalDelay = Math.floor(jitter);
      
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${totalDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
}

// Usage
try {
  const response = await fetchWithRetry('/api/data', {}, { maxRetries: 3 });
  const data = await response.json();
} catch (error) {
  console.error('All retries failed:', error);
  // ✅ Show user-friendly error
}
```

**B. Idempotency Keys for State-Changing Operations**

```javascript
// ✅ GOOD: Idempotent POST with unique key
async function createPaymentWithRetry(paymentData) {
  const idempotencyKey = crypto.randomUUID();  // ✅ Generate once, reuse for retries
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey  // ✅ Same key for all retries
        },
        body: JSON.stringify(paymentData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // ✅ Don't retry if payment already processed
      if (response.status === 409) {  // Conflict - duplicate detected
        throw new Error('Payment already processed');
      }
      
      // ✅ Don't retry invalid payment data
      if (response.status === 400) {
        throw new Error('Invalid payment data');
      }
      
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
      
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }
}

// ✅ Backend validation of idempotency key
// Server-side (Node.js/Express example)
const processedPayments = new Map();  // In production: use Redis

app.post('/api/payment', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key required' });
  }
  
  // ✅ Check if already processed
  if (processedPayments.has(idempotencyKey)) {
    return res.status(409).json({ 
      error: 'Payment already processed',
      paymentId: processedPayments.get(idempotencyKey)
    });
  }
  
  // Process payment...
  const paymentId = await processPayment(req.body);
  
  // ✅ Store for 24 hours
  processedPayments.set(idempotencyKey, paymentId);
  setTimeout(() => processedPayments.delete(idempotencyKey), 86400000);
  
  res.status(200).json({ paymentId });
});
```

**C. Circuit Breaker Pattern**

```javascript
// ✅ GOOD: Circuit breaker to prevent cascading failures
class CircuitBreaker {
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.timeout = config.timeout || 60000;  // 1 minute
    this.resetTimeout = config.resetTimeout || 30000;  // 30 seconds
    
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';  // ✅ Try one request
        console.log('Circuit breaker: HALF_OPEN - testing service');
      } else {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('Circuit breaker: CLOSED - service healthy');
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker: OPEN - ${this.failureCount} failures detected`);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failureCount,
      lastFailure: this.lastFailureTime
    };
  }
}

// Usage
const apiBreaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000,
  resetTimeout: 30000
});

async function fetchData() {
  try {
    return await apiBreaker.execute(() => 
      fetch('/api/data').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    );
  } catch (error) {
    // ✅ Show fallback UI when circuit is open
    if (error.message.includes('Circuit breaker')) {
      showServiceUnavailableMessage();
    }
    throw error;
  }
}
```

**D. React Query with Retry Configuration**

```javascript
// ✅ GOOD: React Query with smart retry logic
import { useQuery } from '@tanstack/react-query';

function useUserData(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: (failureCount, error) => {
      // ✅ Don't retry client errors (4xx)
      if (error.message.includes('HTTP 4')) return false;
      
      // ✅ Don't retry auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      
      // ✅ Max 3 retries for server errors (5xx)
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // ✅ Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    },
    staleTime: 5000,  // ✅ Cache for 5 seconds
    onError: (error) => {
      console.error('Query failed after retries:', error);
    }
  });
}
```

**E. Axios with Retry Interceptor**

```javascript
// ✅ GOOD: Axios with axios-retry plugin
import axios from 'axios';
import axiosRetry from 'axios-retry';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000  // ✅ 10s timeout per request
});

axiosRetry(apiClient, {
  retries: 3,  // ✅ Max 3 retries
  retryDelay: axiosRetry.exponentialDelay,  // ✅ Exponential backoff
  retryCondition: (error) => {
    // ✅ Only retry network errors and 5xx
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response && error.response.status >= 500);
  },
  shouldResetTimeout: true,  // ✅ Reset timeout on each retry
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Retry ${retryCount} for ${requestConfig.url}`, error.message);
  }
});

// Usage
try {
  const response = await apiClient.get('/user/123');
  console.log(response.data);
} catch (error) {
  console.error('All retries failed:', error);
}
```

#### Retry Security Checklist

```javascript
const RETRY_SECURITY_RULES = {
  // ✅ Required
  '✅ Maximum retry limit': '3-5 attempts maximum',
  '✅ Exponential backoff': '1s, 2s, 4s, 8s... (2^n)',
  '✅ Jitter/randomization': '±25% to prevent thundering herd',
  '✅ Per-request timeout': '5-10 seconds per attempt',
  '✅ Total timeout': '30-60 seconds for all retries',
  
  // ✅ Idempotency
  '✅ Idempotency keys': 'For POST/PUT/DELETE operations',
  '✅ UUID generation': 'Unique key per operation',
  '✅ Server-side validation': 'Check for duplicate keys',
  
  // ✅ Circuit breaker
  '✅ Failure threshold': 'Open circuit after 5+ failures',
  '✅ Reset timeout': 'Try again after 30-60 seconds',
  '✅ Half-open state': 'Test with 1 request before fully closing',
  
  // ❌ Don't retry
  '❌ 4xx client errors': 'Invalid request won\'t succeed',
  '❌ 401/403 auth errors': 'May trigger account lockout',
  '❌ 400 validation errors': 'Data won\'t become valid',
  '❌ Non-idempotent POST': 'Unless using idempotency keys',
  
  // ✅ Only retry
  '✅ 5xx server errors': '500, 502, 503, 504',
  '✅ Network errors': 'ECONNRESET, ETIMEDOUT',
  '✅ 429 rate limit': 'With Retry-After header',
  '✅ 408 timeout': 'Request timeout',
  '✅ Idempotent methods': 'GET, HEAD, OPTIONS, PUT (with key)'
};
```

#### Audit Output Format

```markdown
🔴 HIGH | Unsafe Retry Pattern - Infinite Loop Risk

File: src/services/api.js
Line: 67-71
Issue: Recursive retry without limit can cause stack overflow and resource exhaustion

Code:
65 | async function fetchData() {
66 |   try {
67 |     return await fetch('/api/data');
68 |   } catch (error) {
69 |     return fetchData();  // ❌ Infinite recursion on persistent failure
70 |   }
71 | }

Remediation:
1. Add maximum retry limit (3-5 attempts)
2. Implement exponential backoff with jitter
3. Add timeout for each attempt
4. Use circuit breaker pattern for service health

Example Fix:
async function fetchData(retries = 0, maxRetries = 3) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('/api/data', {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
    
  } catch (error) {
    if (retries >= maxRetries) {
      throw new Error('Max retries exceeded');
    }
    
    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, retries);
    const jitter = baseDelay * (0.5 + Math.random() * 0.5);
    
    console.log(`Retry ${retries + 1}/${maxRetries} after ${Math.floor(jitter)}ms`);
    await new Promise(r => setTimeout(r, jitter));
    
    return fetchData(retries + 1, maxRetries);
  }
}

Security Impact: CRITICAL
- Memory exhaustion from infinite recursion
- Stack overflow after ~10,000 calls
- Backend service overload (DDoS-like)
- Increased API costs (100x-1000x)
- Cascading failures across services
- Database connection pool exhaustion

Real-World Example:
- API is down for 5 minutes
- Without retry limit: 300,000 requests (1 per second × 300s × 1000 users)
- With 3 retries + backoff: ~12,000 requests (4 attempts × 1000 users)
- Cost reduction: 96%

References:
- CWE-834: Excessive Iteration
- CWE-400: Uncontrolled Resource Consumption
- OWASP A04:2021 – Insecure Design
- RFC 7231: HTTP Retry Semantics
```

---

### Module 18: Memory Leak Detection & Resource Cleanup

**Severity:** 🔴 HIGH

#### Detection Rules

**❌ CRITICAL: Uncleaned Resources**

```javascript
// Pattern 1: Socket connections not cleaned up
function ChatComponent() {
  const socket = io('https://chat.example.com');  // ❌ Never disconnected
  
  return <div>Chat...</div>;
}

// Pattern 2: Event listeners not removed
function WindowResizer() {
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // ❌ No cleanup - listener persists after unmount
  }, []);
}

// Pattern 3: Timers/Intervals not cleared
function AutoRefresh() {
  useEffect(() => {
    const timer = setInterval(() => fetchData(), 5000);
    // ❌ No cleanup - interval runs forever
  }, []);
}

// Pattern 4: Subscriptions not unsubscribed
function DataStream() {
  useEffect(() => {
    const subscription = dataService.subscribe(data => setData(data));
    // ❌ No cleanup - subscription leaks
  }, []);
}

// Pattern 5: DOM references held in closures
function ImageViewer({ images }) {
  const imageRefs = images.map(() => React.createRef());  // ❌ Old refs never released
  
  return images.map((img, i) => (
    <img key={i} ref={imageRefs[i]} src={img} />
  ));
}

// Pattern 6: WebRTC connections not closed
function VideoCall() {
  const peerConnection = new RTCPeerConnection();  // ❌ Never closed
  
  useEffect(() => {
    peerConnection.createOffer();
    // ❌ No cleanup
  }, []);
}

// Pattern 7: Fetch/Axios requests not aborted
function SearchResults({ query }) {
  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(setResults);
    // ❌ No AbortController - pending requests continue after unmount
  }, [query]);
}

// Pattern 8: IntersectionObserver not disconnected
function LazyImage({ src }) {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      // handle intersection
    });
    observer.observe(imageRef.current);
    // ❌ No cleanup - observer remains active
  }, []);
}
```

#### Security & Performance Risks

| Risk | Description | Impact |
|------|-------------|--------|
| **Memory Exhaustion** | Leaked objects accumulate in heap | Browser crash, tab freeze |
| **Connection Overload** | Unclosed sockets exhaust connections | Server refuses new connections |
| **Event Handler Buildup** | Duplicate listeners on re-render | Callbacks fire multiple times |
| **Performance Degradation** | Timers/observers run in background | Battery drain, CPU spikes |
| **Race Conditions** | Requests complete after unmount | setState on unmounted component errors |
| **DoS Vulnerability** | Attackers trigger memory leaks | Intentional browser/server crash |

#### Approved Patterns

**A. Socket Connection Cleanup**

```javascript
// ✅ GOOD: Socket cleanup in useEffect return
import { useEffect } from 'react';
import io from 'socket.io-client';

function ChatComponent() {
  useEffect(() => {
    const socket = io('https://chat.example.com');
    
    socket.on('message', handleMessage);
    socket.on('error', handleError);
    
    // ✅ Cleanup function - runs on unmount
    return () => {
      socket.off('message', handleMessage);
      socket.off('error', handleError);
      socket.disconnect();
      socket.close();
    };
  }, []);
  
  return <div>Chat...</div>;
}
```

**B. Event Listener Cleanup**

```javascript
// ✅ GOOD: Remove event listeners on cleanup
function WindowResizer() {
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    
    window.addEventListener('resize', handleResize);
    
    // ✅ Cleanup - removes listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}

// ✅ GOOD: Multiple event listeners cleanup
function DocumentEventHandler() {
  useEffect(() => {
    const handleKeyDown = (e) => { /* ... */ };
    const handleClick = (e) => { /* ... */ };
    const handleScroll = (e) => { /* ... */ };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);
}
```

**C. Timer/Interval Cleanup**

```javascript
// ✅ GOOD: Clear timers on cleanup
function AutoRefresh() {
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
    }, 5000);
    
    // ✅ Cleanup - clears interval
    return () => clearInterval(timer);
  }, []);
}

// ✅ GOOD: Timeout cleanup
function DelayedAction() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      performAction();
    }, 3000);
    
    // ✅ Cleanup - clears timeout
    return () => clearTimeout(timeout);
  }, []);
}

// ✅ GOOD: requestAnimationFrame cleanup
function AnimatedComponent() {
  useEffect(() => {
    let rafId;
    
    const animate = () => {
      // animation logic
      rafId = requestAnimationFrame(animate);
    };
    
    rafId = requestAnimationFrame(animate);
    
    // ✅ Cleanup - cancels animation
    return () => cancelAnimationFrame(rafId);
  }, []);
}
```

**D. Subscription Cleanup**

```javascript
// ✅ GOOD: Unsubscribe from observables/streams
import { useEffect, useState } from 'react';

function DataStream() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const subscription = dataService.subscribe({
      next: (value) => setData(value),
      error: (err) => console.error(err)
    });
    
    // ✅ Cleanup - unsubscribes
    return () => subscription.unsubscribe();
  }, []);
}

// ✅ GOOD: RxJS subscription cleanup
import { fromEvent } from 'rxjs';

function MouseTracker() {
  useEffect(() => {
    const subscription = fromEvent(document, 'mousemove')
      .subscribe(event => {
        setPosition({ x: event.clientX, y: event.clientY });
      });
    
    return () => subscription.unsubscribe();
  }, []);
}
```

**E. Fetch/Axios Abort on Unmount**

```javascript
// ✅ GOOD: AbortController for fetch requests
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    fetch(`/api/search?q=${query}`, {
      signal: abortController.signal  // ✅ Attach abort signal
    })
      .then(res => res.json())
      .then(data => setResults(data))
      .catch(err => {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted');  // Expected on cleanup
        }
      });
    
    // ✅ Cleanup - aborts pending request
    return () => abortController.abort();
  }, [query]);
}

// ✅ GOOD: Axios cancellation token
import axios from 'axios';

function UserProfile({ userId }) {
  useEffect(() => {
    const cancelToken = axios.CancelToken.source();
    
    axios.get(`/api/users/${userId}`, {
      cancelToken: cancelToken.token
    })
      .then(res => setUser(res.data))
      .catch(err => {
        if (axios.isCancel(err)) {
          console.log('Request canceled');
        }
      });
    
    // ✅ Cleanup - cancels request
    return () => cancelToken.cancel('Component unmounted');
  }, [userId]);
}
```

**F. Observer Cleanup (Intersection, Mutation, Resize)**

```javascript
// ✅ GOOD: IntersectionObserver cleanup
function LazyImage({ src }) {
  const imageRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.src = src;
          observer.unobserve(entry.target);
        }
      });
    });
    
    if (imageRef.current) {
      observer.observe(imageRef.current);
    }
    
    // ✅ Cleanup - disconnects observer
    return () => observer.disconnect();
  }, [src]);
  
  return <img ref={imageRef} />;
}

// ✅ GOOD: ResizeObserver cleanup
function ResponsiveComponent() {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      setDimensions({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      });
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // ✅ Cleanup
    return () => resizeObserver.disconnect();
  }, []);
}

// ✅ GOOD: MutationObserver cleanup
function DOMWatcher() {
  useEffect(() => {
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        console.log('DOM changed:', mutation);
      });
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // ✅ Cleanup
    return () => mutationObserver.disconnect();
  }, []);
}
```

**G. WebRTC Connection Cleanup**

```javascript
// ✅ GOOD: Properly close WebRTC connections
function VideoCall({ roomId }) {
  const peerConnectionRef = useRef(null);
  
  useEffect(() => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    peerConnectionRef.current = peerConnection;
    
    // Setup peer connection
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer));
    
    // ✅ Cleanup - close all tracks and connection
    return () => {
      // Close all local streams
      const localStream = peerConnection.getLocalStreams()[0];
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close remote streams
      const remoteStream = peerConnection.getRemoteStreams()[0];
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      peerConnection.close();
    };
  }, [roomId]);
}
```

**H. Custom Hook for Resource Cleanup**

```javascript
// ✅ GOOD: Reusable cleanup hook
function useCleanup(cleanup) {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}

// Usage
function MyComponent() {
  const socket = useMemo(() => io('https://api.example.com'), []);
  
  useCleanup(() => {
    socket.disconnect();
  });
  
  return <div>Component</div>;
}
```

#### Scanner Implementation

```javascript
/**
 * Scans for common memory leak patterns in React components
 */
function scanForMemoryLeaks(filePath) {
  const violations = [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Patterns to detect
  const leakPatterns = [
    {
      pattern: /io\(['"]/,
      name: 'socket-io',
      cleanup: 'socket.disconnect()',
      severity: 'CRITICAL'
    },
    {
      pattern: /addEventListener\(/,
      name: 'event-listener',
      cleanup: 'removeEventListener()',
      severity: 'HIGH'
    },
    {
      pattern: /setInterval\(/,
      name: 'interval',
      cleanup: 'clearInterval()',
      severity: 'HIGH'
    },
    {
      pattern: /setTimeout\(/,
      name: 'timeout',
      cleanup: 'clearTimeout()',
      severity: 'MEDIUM'
    },
    {
      pattern: /\.subscribe\(/,
      name: 'subscription',
      cleanup: 'unsubscribe()',
      severity: 'HIGH'
    },
    {
      pattern: /new\s+(Intersection|Mutation|Resize)Observer\(/,
      name: 'observer',
      cleanup: 'disconnect()',
      severity: 'MEDIUM'
    },
    {
      pattern: /new\s+RTCPeerConnection\(/,
      name: 'webrtc',
      cleanup: 'close()',
      severity: 'CRITICAL'
    },
    {
      pattern: /fetch\(/,
      name: 'fetch',
      cleanup: 'AbortController',
      severity: 'MEDIUM'
    }
  ];
  
  let inUseEffect = false;
  let hasReturnCleanup = false;
  let useEffectStartLine = -1;
  
  lines.forEach((line, index) => {
    // Track useEffect blocks
    if (line.includes('useEffect(')) {
      inUseEffect = true;
      hasReturnCleanup = false;
      useEffectStartLine = index + 1;
    }
    
    // Check for return cleanup in useEffect
    if (inUseEffect && /return\s*\(\s*\)\s*=>/.test(line)) {
      hasReturnCleanup = true;
    }
    
    // End of useEffect
    if (inUseEffect && line.includes('}, [')) {
      // Check if any leak patterns were found without cleanup
      leakPatterns.forEach(({ pattern, name, cleanup, severity }) => {
        const effectBlock = lines.slice(useEffectStartLine, index).join('\n');
        
        if (pattern.test(effectBlock) && !hasReturnCleanup) {
          violations.push({
            file: filePath,
            line: useEffectStartLine,
            severity,
            type: name,
            cleanup,
            message: `${name} used without cleanup function`
          });
        }
      });
      
      inUseEffect = false;
    }
  });
  
  return violations;
}
```

#### Audit Output

```markdown
🚨 CRITICAL | Memory Leak - Unclosed Socket Connection

File: src/components/ChatRoom.jsx
Line: 15-25
Issue: Socket.IO connection created without cleanup

Code:
12 | function ChatRoom({ roomId }) {
13 |   const [messages, setMessages] = useState([]);
14 |   
15 |   useEffect(() => {
16 |     const socket = io('https://chat.example.com');
17 |     
18 |     socket.emit('join', roomId);
19 |     socket.on('message', msg => setMessages(prev => [...prev, msg]));
20 |     
21 |     // ❌ No cleanup - socket remains connected after unmount
22 |   }, [roomId]);
23 | }

Remediation:
1. Add return cleanup function to useEffect
2. Disconnect socket and remove event listeners
3. Prevent memory leak and zombie connections

Example Fix:
```javascript
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const socket = io('https://chat.example.com');
    
    const handleMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };
    
    socket.emit('join', roomId);
    socket.on('message', handleMessage);
    
    // ✅ Cleanup function
    return () => {
      socket.off('message', handleMessage);
      socket.emit('leave', roomId);
      socket.disconnect();
    };
  }, [roomId]);
}
```

Security Impact: CRITICAL
- Memory exhaustion (leaked connections)
- Server connection pool exhaustion
- Zombie sockets continue receiving data
- Battery drain on mobile devices
- Potential DoS if attacker opens/closes components rapidly

Performance Impact:
- 1 leaked socket per component mount
- 100 mounts = 100 active connections
- Each socket consumes ~10KB memory + 1 TCP connection
- Can exhaust browser connection limit (6-10 per domain)

References:
- CWE-404: Improper Resource Shutdown
- CWE-772: Missing Release of Resource
- OWASP A04:2021 – Insecure Design
```

#### Memory Leak Testing

```javascript
// ✅ Test for memory leaks in development
if (process.env.NODE_ENV === 'development') {
  // Log memory usage
  setInterval(() => {
    if (performance.memory) {
      console.log('Memory:', {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      });
    }
  }, 5000);
  
  // Warn on unmounted setState
  const originalSetState = React.Component.prototype.setState;
  React.Component.prototype.setState = function(...args) {
    if (this._unmounted) {
      console.error('Warning: setState called on unmounted component', this);
    }
    return originalSetState.apply(this, args);
  };
}
```

#### Browser DevTools Detection

```bash
# Chrome DevTools - Memory Profiler
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Interact with app (mount/unmount components)
4. Take another heap snapshot
5. Compare snapshots - look for:
   - Detached DOM nodes
   - Event listeners
   - Socket connections
   - Timers

# React DevTools - Profiler
1. Install React DevTools extension
2. Open Profiler tab
3. Record session while mounting/unmounting
4. Check for:
   - Components not unmounting
   - Effects without cleanup
```

References:
- CWE-404: Improper Resource Shutdown
- CWE-772: Missing Release of Resource After Effective Lifetime
- CWE-401: Missing Release of Memory after Effective Lifetime
- OWASP A04:2021 – Insecure Design
```

---

## 🔧 Implementation Guide

> **Important:** This repository provides agent/prompt documentation only.  
> The `react-security-audit` CLI commands below are **illustrative examples** for teams who build or adopt a compatible audit tool.

### Step 1: Run Initial Audit

```bash
# Example: install your security audit CLI
npm install -g react-security-audit-agent

# Example: run audit (asks for permission)
react-security-audit --scan ./src --report markdown

# Output: security-audit-report.md
```

### Step 2: Review & Prioritize

```bash
# Example: view critical issues only
react-security-audit --severity critical

# Example: export to JSON for CI/CD
react-security-audit --format json > audit.json
```

### Step 3: Fix Issues

```bash
# Example: auto-fix safe issues (with confirmation)
react-security-audit --fix

# Example: generate remediation snippets
react-security-audit --generate-fixes
```

### Step 4: CI/CD Integration

```yaml
# Example workflow: .github/workflows/security-audit.yml
name: Security Audit

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security Audit
        run: |
          npx react-security-audit --fail-on critical
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-audit-report.md
```

---

## 📚 Security References

- **OWASP Top 10 2021:** https://owasp.org/Top10/
- **CWE Top 25:** https://cwe.mitre.org/top25/
- **React Security Docs:** https://react.dev/learn/security
- **Next.js Security:** https://nextjs.org/docs/advanced-features/security-headers
- **PCI DSS Requirements:** https://www.pcisecuritystandards.org/
- **GDPR Compliance:** https://gdpr.eu/

---

## 🎯 Agent Execution Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Request User Permission                          │
│    ✓ Scan .env files?                               │
│    ✓ Scan source code?                              │
│    ✓ Scan dependencies?                             │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 2. Auto-Detect Framework                            │
│    → package.json analysis                          │
│    → React (CRA/Vite) or Next.js                    │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 3. Run Security Modules (Parallel)                  │
│    ▸ Authentication Guard                           │
│    ▸ Secret Scanner                                 │
│    ▸ XSS Detector                                   │
│    ▸ Storage Guard                                  │
│    ▸ Payment Security                               │
│    ▸ CSRF Check                                     │
│    ▸ [12 more modules...]                           │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 4. Aggregate & Prioritize Issues                    │
│    → Group by severity                              │
│    → Deduplicate findings                           │
│    → Add file paths + line numbers                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 5. Generate Audit Report                            │
│    → Executive summary                              │
│    → Detailed findings with evidence                │
│    → Remediation code snippets                      │
│    → Compliance mapping (OWASP, PCI, GDPR)          │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 6. Output Results                                   │
│    ✓ Terminal summary                               │
│    ✓ Markdown report                                │
│    ✓ JSON export (CI/CD)                            │
│    ✓ Exit code (0 = pass, 1 = fail)                │
└─────────────────────────────────────────────────────┘
```

---

**Agent Version:** 2.0.0  
**Last Updated:** March 3, 2026  
**Maintained By:** Security Engineering Team