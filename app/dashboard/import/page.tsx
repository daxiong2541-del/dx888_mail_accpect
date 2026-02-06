import { redirect } from 'next/navigation';

export default function ImportPageRedirect() {
  redirect('/dashboard/emails');
}
