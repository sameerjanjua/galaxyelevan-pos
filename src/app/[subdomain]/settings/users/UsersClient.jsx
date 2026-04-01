"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UsersClient({ initialUsers, locations, currentUserRole, currentUserId }) {
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
     fullName: "",
     email: "",
     password: "",
     role: "STAFF",
     locationId: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Handlers for modal
  const openNewModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "STAFF",
      locationId: currentUserRole === 'MANAGER' ? (users.find(u => u.id === currentUserId)?.locationId || "") : (locations.length > 0 ? locations[0].id : ""),
    });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: "", // Leave blank unless changing
      role: user.role,
      locationId: user.locationId || "",
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password; // Don't send empty password on update
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save user");
      }

      // Reload list
      router.refresh();
      // Refetch clientside
      const fetchUsers = await fetch("/api/users");
      const fetchedData = await fetchUsers.json();
      if(fetchedData.users) setUsers(fetchedData.users);

      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user) => {
    if (user.id === currentUserId) return;
    
    try {
       const res = await fetch(`/api/users/${user.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ isActive: !user.isActive }),
       });
       
       if (res.ok) {
           router.refresh();
           setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
       } else {
           const data = await res.json();
           alert(data.error || "Failed to change status");
       }
    } catch (err) {
       console.error(err);
    }
  };

  return (
     <div>
       <div className="flex items-center justify-between mb-6">
         <div>
           <h2 className="text-xl font-bold">Team Members</h2>
           <p className="text-sm text-slate-400">Manage your staff and their access levels.</p>
         </div>
         <button
           onClick={openNewModal}
           className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
         >
           + Add User
         </button>
       </div>

       <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
         <table className="w-full text-left text-sm">
           <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
             <tr>
               <th className="px-6 py-4 font-medium">Name</th>
               <th className="px-6 py-4 font-medium">Role</th>
               <th className="px-6 py-4 font-medium">Location</th>
               <th className="px-6 py-4 font-medium">Status</th>
               <th className="px-6 py-4 font-medium text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-800/60">
             {users.map((user) => (
               <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                 <td className="px-6 py-4">
                   <div className="font-medium text-slate-200">{user.fullName}</div>
                   <div className="text-xs text-slate-500">{user.email}</div>
                 </td>
                 <td className="px-6 py-4">
                   <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 ${user.role === 'OWNER' ? 'text-amber-400' : user.role === 'MANAGER' ? 'text-sky-400' : 'text-emerald-400'}`}>
                     {user.role}
                   </span>
                 </td>
                 <td className="px-6 py-4 text-slate-300">
                   {user.location?.name || <span className="text-slate-500 italic">All Locations</span>}
                 </td>
                 <td className="px-6 py-4">
                   <span className={`inline-flex items-center gap-1.5 ${user.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                     <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                     {user.isActive ? 'Active' : 'Inactive'}
                   </span>
                 </td>
                 <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 text-sm">
                      <button
                        onClick={() => openEditModal(user)}
                        disabled={
                          (user.role === 'OWNER' && currentUserRole !== 'OWNER' && currentUserId !== user.id) ||
                          (currentUserRole === 'MANAGER' && currentUserId !== user.id && (user.locationId !== users.find(u => u.id === currentUserId)?.locationId || user.role !== 'STAFF'))
                        }
                        className="text-sky-400 hover:text-sky-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Edit
                      </button>
                      
                      {user.id !== currentUserId && (currentUserRole === 'OWNER' || (currentUserRole === 'MANAGER' && user.locationId === users.find(u => u.id === currentUserId)?.locationId && user.role === 'STAFF')) && (
                         <button
                           onClick={() => toggleUserStatus(user)}
                           className={`${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                         >
                           {user.isActive ? 'Deactivate' : 'Activate'}
                         </button>
                      )}
                    </div>
                 </td>
               </tr>
             ))}
             {users.length === 0 && (
               <tr>
                 <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No users found.
                 </td>
               </tr>
             )}
           </tbody>
         </table>
       </div>

       {/* Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
             <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-100">
                 {editingUser ? "Edit User" : "Add New User"}
               </h3>
               <button onClick={closeModal} className="text-slate-400 hover:text-white">✕</button>
             </div>
             
             <div className="p-6 overflow-y-auto">
               {error && (
                 <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
                   {error}
                 </div>
               )}

               <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                   <input
                     required
                     type="text"
                     value={formData.fullName}
                     onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                     placeholder="John Doe"
                   />
                 </div>
                                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      disabled={!!editingUser && currentUserRole !== 'OWNER'}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="john@example.com"
                    />
                  </div>

                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">
                     {editingUser ? "New Password (leave blank to keep current)" : "Password *"}
                   </label>
                   <input
                     required={!editingUser}
                     type="password"
                     value={formData.password}
                     onChange={(e) => setFormData({...formData, password: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                     placeholder="••••••••"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1">Role *</label>
                     <select
                       required
                       disabled={currentUserRole === 'MANAGER'}
                       value={formData.role}
                       onChange={(e) => setFormData({...formData, role: e.target.value})}
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none disabled:opacity-50"
                     >
                       {currentUserRole === 'OWNER' && <option value="OWNER">Owner</option>}
                       {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && <option value="MANAGER">Manager</option>}
                       <option value="STAFF">Staff</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1">Location</label>
                     <select
                       disabled={currentUserRole === 'MANAGER'}
                       value={formData.locationId || ""}
                       onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none disabled:opacity-50"
                     >
                       <option value="">All Locations (HQ)</option>
                       {locations.map(loc => (
                         <option key={loc.id} value={loc.id}>{loc.name}</option>
                       ))}
                     </select>
                   </div>
                 </div>
               </form>
             </div>
             
             <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
               <button
                 type="button"
                 onClick={closeModal}
                 className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                 disabled={isSubmitting}
               >
                 Cancel
               </button>
               <button
                 type="submit"
                 form="user-form"
                 disabled={isSubmitting}
                 className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
               >
                 {isSubmitting ? "Saving..." : "Save User"}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
  );
}
