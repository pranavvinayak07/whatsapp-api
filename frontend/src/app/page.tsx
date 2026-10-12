import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('token');

  if (token?.value) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
