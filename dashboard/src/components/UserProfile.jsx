// ============================================================
// 🪤 BẪY REFACTOR (REFACTOR TRAP)
// Component này CỐ TÌNH dùng cú pháp React 18 cũ:
//   - forwardRef  → React 19 cho phép nhận ref như prop thường
//   - useContext  → React 19 khuyến khích dùng use()
// DevOps-Guard Refactor Engine sẽ tự động nâng cấp lên React 19.
// ============================================================

import React, { forwardRef, useContext, createContext } from 'react'

// ❌ React 18 pattern: Tạo context riêng (React 19 khuyến khích use())
export const ThemeContext = createContext({
  mode: 'dark',
  primaryColor: '#6366f1',
  fontFamily: 'Inter, system-ui, sans-serif',
})

// ❌ React 18 pattern: forwardRef wrapper (React 19 hỗ trợ ref như prop)
const UserProfile = forwardRef(function UserProfile(props, ref) {
  const { name, email, role = 'Developer', avatarUrl } = props

  // ❌ React 18 pattern: useContext (React 19 dùng use(ThemeContext))
  const theme = useContext(ThemeContext)

  const cardStyle = {
    backgroundColor: theme.mode === 'dark' ? '#1e1e2e' : '#ffffff',
    color: theme.mode === 'dark' ? '#cdd6f4' : '#1e1e2e',
    borderLeft: `4px solid ${theme.primaryColor}`,
    borderRadius: '12px',
    padding: '24px',
    fontFamily: theme.fontFamily,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    maxWidth: '420px',
    margin: '16px 0',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  }

  const avatarStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: theme.primaryColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    marginRight: '16px',
    flexShrink: 0,
  }

  const getInitials = (fullName) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div ref={ref} style={cardStyle} className="user-profile-card">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name} avatar`}
            style={{ ...avatarStyle, objectFit: 'cover' }}
          />
        ) : (
          <div style={avatarStyle}>{getInitials(name)}</div>
        )}
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>
            {name}
          </h3>
          <p style={{ margin: '0 0 2px 0', fontSize: '14px', opacity: 0.7 }}>
            {email}
          </p>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: `${theme.primaryColor}22`,
              color: theme.primaryColor,
              marginTop: '4px',
            }}
          >
            {role}
          </span>
        </div>
      </div>
    </div>
  )
})

export default UserProfile
