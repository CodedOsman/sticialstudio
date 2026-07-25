import { redirect } from 'next/navigation';

export default function WelcomePage() {
  redirect('/projects/ide');
}

