import { redirect } from 'next/navigation';

// No landing page: the site's front door is the patient portal.
// Staff reach /login from the link in the portal footer.
export default function RootPage() {
  redirect('/portal');
}
