function Users() {
    const [users, setUsers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState(null);
    const [formData, setFormData] = React.useState({
        name: '',
        role: 'cashier',
        pin: ''
    });

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const usersData = await Storage.getUsers();
                setUsers(usersData);
            } catch (error) {
                console.error('Error loading users:', error);
                setUsers([]);
            }
        };
        loadData();
    }, []);

    const handleAddUser = () => {
        setEditingUser(null);
        setFormData({ name: '', role: 'cashier', pin: '' });
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            role: user.role,
            pin: user.pin
        });
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to archive this user? (It can be restored later)')) {
            try {
                await Storage.deleteUser(id);
                const updated = users.filter(u => u.id !== id);
                setUsers(updated);
            } catch (error) {
                console.error('Error archiving user:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newUser = {
            id: editingUser ? editingUser.id : null, // API will generate sequential ID
            ...formData
        };

        try {
            if (editingUser) {
                // Update existing user
                await Storage.updateUser(newUser);
            } else {
                // Add new user
                await Storage.addUser(newUser);
            }

            // Refresh users list from database
            const updatedUsersList = await Storage.getUsers();
            setUsers(updatedUsersList);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    return (
        <div className="space-y-6" data-name="users">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-color)]">User Management</h2>
                <Button onClick={handleAddUser}>
                    <div className="icon-user-plus w-4 h-4"></div> Add User
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] text-gray-500 text-sm">
                                <th className="p-3">Name</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">PIN Code</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-color)]">
                                    <td className="p-3 font-medium text-[var(--text-color)]">{user.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs uppercase font-bold ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-[var(--text-color)] font-mono">****</td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                        >
                                            <div className="icon-pencil w-4 h-4"></div>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                            disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1} // Prevent deleting last admin
                                        >
                                            <div className="icon-trash w-4 h-4"></div>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? "Edit User" : "Add User"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                        >
                            <option value="cashier">Cashier</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">PIN Code (4 digits)</label>
                        <input
                            required
                            type="text"
                            maxLength="4"
                            pattern="\d{4}"
                            value={formData.pin}
                            onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] font-mono tracking-widest"
                        />
                    </div>
                    <Button type="submit" className="w-full">Save User</Button>
                </form>
            </Modal>
        </div>
    );
}