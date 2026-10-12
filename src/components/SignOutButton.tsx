import { LogOut } from 'lucide-react'
import Button from './Button'
import { useAuth } from '../hooks/auth'

export default function SignOutButton() {
  const { signOut } = useAuth()
  return <Button label="Sign out" variant="ghost" icon={<LogOut size={16} />} onClick={signOut} />
}
