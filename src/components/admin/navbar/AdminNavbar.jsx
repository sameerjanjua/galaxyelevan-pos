export function AdminNavbar({ userName, onLogout }) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        {userName ? (
          <p className="text-sm text-gray-400 mt-1">Signed in as {userName}</p>
        ) : null}
      </div>

      <form action={onLogout}>
        <button
          type="submit"
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </form>
    </header>
  );
}
