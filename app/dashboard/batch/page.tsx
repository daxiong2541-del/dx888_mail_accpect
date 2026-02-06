import { redirect } from 'next/navigation';

export default function BatchPageRedirect() {
  redirect('/dashboard/emails');
}
