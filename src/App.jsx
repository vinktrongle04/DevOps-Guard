// ============================================================
// 🚨 BẪY BẢO MẬT (SECURITY LEAK TRAP)
// File này CỐ TÌNH chứa nhiều loại API Key lộ thiên để demo
// Security Gate v2.0 — 25 rules × 9 categories.
// DevOps-Guard sẽ phát hiện TẤT CẢ và chặn commit.
// ============================================================

import { useState } from 'react'
import UserProfile from './components/UserProfile.jsx'
import './App.css'

// ═══════════════════════════════════════════════════════════════
// ❌ HARDCODED SECRETS — MỖI DÒNG LÀ MỘT VI PHẠM BẢO MẬT
// ═══════════════════════════════════════════════════════════════

// 🔴 [GOOG-001] Google API Key
const apiKey = "AIzaSyDFj3kLm9Qw2xRtBvN8HpO5YzA1cE7gX0a"

// 🔴 [AI-001] OpenAI API Key
const OPENAI_KEY = "sk-proj-FAKE00000000000000000000000000000000000000000000"

// 🔴 [PAY-001] Stripe Live Secret Key  
const STRIPE_KEY_SECRET = "rk_live_DEMO_51NxBqRtY8mKvL3dF9wQzXcV7bA0"

// 🔴 [VCS-001] GitHub Personal Access Token
const GITHUB_TOKEN = "github_pat_FAKE0000000000000000000000000000000"

// 🔴 [AWS-001] AWS Access Key
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"

// 🟠 [COM-001] Twilio API Key
const TWILIO_KEY = "SK00000000000000000000000000000000"

// 🟠 [COM-002] SendGrid API Key
const SENDGRID_KEY = "SG.FAKE0000000000000000000.FAKE000000000000000000000000000000000000000000"

// 🔴 [DB-001] Database Connection String
const DATABASE_URL = "mongodb+srv://admin:SuperSecret123@cluster0.abc123.mongodb.net/production"

function App() {
  const [count, setCount] = useState(0)

  // ❌ Sử dụng API Key trực tiếp (anti-pattern)
  const fetchData = async () => {
    const response = await fetch(
      `https://api.example.com/data?key=${apiKey}`
    )
    return response.json()
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🛡️ DevOps Guard - Demo Project</h1>
        <p className="subtitle">
          Dự án mẫu chứa các lỗi cố tình để demo khả năng của Tác tử
        </p>
      </header>

      <main className="app-main">
        <section className="demo-card">
          <h2>🔐 Security Gate Demo</h2>
          <p>File này chứa API Key lộ thiên. DevOps-Guard sẽ phát hiện!</p>
          <code className="code-block">
            const apiKey = "AIzaSy..." {/* Masked for UI */}
          </code>
        </section>

        <section className="demo-card">
          <h2>📦 Dependency Gate Demo</h2>
          <p>
            <code>lodash</code> được khai báo trong package.json nhưng không
            được import ở bất kỳ đâu → Thư viện rác!
          </p>
        </section>

        <section className="demo-card">
          <h2>⚛️ Refactor Engine Demo</h2>
          <p>Component UserProfile sử dụng cú pháp React 18 cũ:</p>
          <ul>
            <li><code>forwardRef</code> (deprecated in React 19)</li>
            <li><code>useContext(ThemeContext)</code> → nên dùng <code>use(ThemeContext)</code></li>
          </ul>
          <UserProfile name="Vinh Le" email="vinh@devops-guard.dev" />
        </section>

        <section className="demo-card">
          <h2>🔢 Counter: {count}</h2>
          <button onClick={() => setCount((c) => c + 1)}>
            Tăng giá trị
          </button>
        </section>
      </main>

      <footer className="app-footer">
        <p>DevOps-Guard © 2026 — Cuộc thi Unbound Creativity with TRAE SOLO</p>
      </footer>
    </div>
  )
}

export default App
