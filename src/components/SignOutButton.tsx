import Button from './Button'
import { useAuth } from '../hooks/auth'

export default function SignOutButton() {
  const { signOut } = useAuth()
  return <Button label="Sign out" variant="ghost" onClick={signOut} />
}
