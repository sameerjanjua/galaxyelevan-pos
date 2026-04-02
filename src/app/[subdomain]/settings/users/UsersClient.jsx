"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActiveLocation } from "@/lib/useActiveLocation";

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
  
  // Get active location from sidebar
  const { activeLocationId } = useActiveLocation();

  const prevLocationRef = useRef(activeLocationId);
  
  useEffect(() => {
    if (prevLocationRef.current !== activeLocationId) {
      prevLocationRef.current = activeLocationId;
      const listUrl = new URL("/api/users", window.location.origin);
      if (activeLocationId) {
        listUrl.searchParams.append("locationId", activeLocationId);
      }
      fetch(listUrl.toString())
        .then(res => res.json())
        .then(data => {
          if (data.users) setUsers(data.users);
        })
        .catch(err => console.error("Error fetching users:", err));
    }
  }, [activeLocationId]);

  // Derived permissions
  const myUserRecord = users.find(u => u.id === currentUserId);
  const myLocation = myUserRecord?.locationId;
  const isGlobalManager = currentUserRole === 'MANAGER' && !myLocation;

  // Staff must always have a location — check if form is valid
  const isStaffRole = formData.role === "STAFF";
  const locationRequired = isStaffRole;
  const locationMissing = locationRequired && !formData.locationId;

  // Handlers for modal
  const openNewModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "STAFF",
      locationId: (currentUserRole === 'MANAGER' && !isGlobalManager)
        ? (myLocation || "")
        : (locations.length > 0 ? locations[0].id : ""),
    });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: "",
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

  const handleRoleChange = (newRole) => {
    const updates = { role: newRole };
    // If switching to Staff and no location selected, default to first location
    if (newRole === "STAFF" && !formData.locationId && locations.length > 0) {
      updates.locationId = locations[0].id;
    }
    setFormData({ ...formData, ...updates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Client-side validation: Staff must have a location
    if (formData.role === "STAFF" && !formData.locationId) {
      setError("Staff members must be assigned to a specific location.");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password;
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

      // Reload list with active location context
      router.refresh();
      const listUrl = new URL("/api/users", window.location.origin);
      if (activeLocationId) {
        listUrl.searchParams.append("locationId", activeLocationId);
      }
      const fetchUsers = await fetch(listUrl.toString());
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
             {users.map((user) => {
               const canEdit = currentUserRole === 'OWNER' || currentUserId === user.id;
                 
               const canToggle = currentUserId !== user.id && (
                 currentUserRole === 'OWNER' || 
                 (currentUserRole === 'MANAGER' && user.role !== 'OWNER' && (isGlobalManager || (user.locationId === myLocation && user.role === 'STAFF')))
               );

               return (
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
                          disabled={!canEdit}
                          className="text-sky-400 hover:text-sky-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        
                        {canToggle && (
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
               );
             })}
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
                      disabled={!!editingUser && currentUserRole !== 'OWNER' && !isGlobalManager}
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
                       disabled={currentUserRole === 'MANAGER' && !isGlobalManager}
                       value={formData.role}
                       onChange={(e) => handleRoleChange(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none disabled:opacity-50"
                     >
                       {currentUserRole === 'OWNER' && <option value="OWNER">Owner</option>}
                       {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && <option value="MANAGER">Manager</option>}
                       <option value="STAFF">Staff</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1">
                       Location {isStaffRole && <span className="text-red-400">*</span>}
                     </label>
                     <select
                       disabled={currentUserRole === 'MANAGER' && !isGlobalManager}
                       required={isStaffRole}
                       value={formData.locationId || ""}
                       onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                       className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none disabled:opacity-50 ${locationMissing ? 'border-red-600' : 'border-slate-800'}`}
                     >
                       {!isStaffRole && <option value="">All Locations (Global)</option>}
                       {isStaffRole && !formData.locationId && <option value="">— Select a location —</option>}
                       {locations.map(loc => (
                         <option key={loc.id} value={loc.id}>{loc.name}</option>
                       ))}
                     </select>
                     {isStaffRole && (
                       <p className="text-[10px] text-slate-500 mt-1">
                         Staff must be assigned to a specific location.
                       </p>
                     )}
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
                 disabled={isSubmitting || locationMissing}
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
