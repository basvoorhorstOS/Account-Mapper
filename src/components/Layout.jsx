import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout({ session }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar session={session} />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <Outlet />
      </main>
    </div>
  )
}
