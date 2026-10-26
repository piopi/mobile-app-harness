import { HoldScreen } from '../features/auth/hold-screen';

/** Gate: the account is suspended (members.status). Nothing else is reachable; every member RPC refuses it. */
export default function Suspended() {
  return <HoldScreen kind="suspended" icon="lock" testID="suspended-screen" />;
}
