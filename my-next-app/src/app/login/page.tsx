import { redirect } from 'next/navigation';
import { getSession, login, logout } from '@/lib/authActions';

export default async function Login() {
  // const session = await getSession();

  const loginHandler = async (formData: FormData) => {
    'use server';
    await login(formData);
    redirect('/');
  };

  const logoutHandler = async () => {
    'use server';
    await logout();
    // redirect('/');
  };

  return (
    <section>
      <div className="flex flex-col p-8">
        {/* {!session ? ( */}
        <form action={loginHandler}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Username
            </label>
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Login
          </button>
        </form>
        {/* ) : ( */}
        <form action={logoutHandler}>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Logout
          </button>
        </form>
        {/* )} */}
      </div>
    </section>
  );
}
