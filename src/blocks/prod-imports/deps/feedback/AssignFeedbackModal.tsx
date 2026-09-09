import { Fragment, useState, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Search } from 'lucide-react'
import { TEAM_MEMBERS, CURRENT_USER_ID, solidAvatarColor, type TeamMember } from '../team/teamMembers'

interface AssignFeedbackModalProps {
    isOpen: boolean
    onClose: () => void
    onAssign: (member: TeamMember) => void
}

export default function AssignFeedbackModal({ isOpen, onClose, onAssign }: AssignFeedbackModalProps) {
    const [query, setQuery] = useState('')
    const me = TEAM_MEMBERS.find(m => m.id === CURRENT_USER_ID) ?? TEAM_MEMBERS[0]
    const others = useMemo(() => {
        const list = TEAM_MEMBERS.filter(m => m.id !== CURRENT_USER_ID)
        if (!query.trim()) return list
        const q = query.toLowerCase()
        return list.filter(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
    }, [query])

    const handleSelect = (member: TeamMember) => {
        onAssign(member)
        setQuery('')
        onClose()
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => { setQuery(''); onClose() }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150"  leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card text-left shadow-2xl border border-border flex flex-col max-h-[80vh]">
                                {/* Header */}
                                <div className="px-6 pt-5 pb-3">
                                    <h2 className="text-xl font-bold text-foreground">Assign Feedback</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Select a team member to assign this feedback to.
                                    </p>
                                </div>

                                {/* Assign to me · highlighted card · matches prod */}
                                <div className="px-6 pb-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(me)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
                                    >
                                        <div className="relative shrink-0">
                                            <div className={`h-10 w-10 rounded-full ${solidAvatarColor(me.initials)} flex items-center justify-center text-xs font-bold text-white`}>
                                                {me.initials}
                                            </div>
                                            {me.online && (
                                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground">Assign to me</span>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400">
                                                    YOU
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {me.name} · {me.role}
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border" />

                                {/* Search */}
                                <div className="px-6 pt-4 pb-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder="Search members..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Member list · scrollable */}
                                <div className="flex-1 overflow-y-auto px-3 pb-3">
                                    {others.length === 0 ? (
                                        <p className="text-center py-6 text-sm text-muted-foreground">No members match your search.</p>
                                    ) : (
                                        <ul className="space-y-0.5">
                                            {others.map(member => (
                                                <li key={member.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelect(member)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                                                    >
                                                        <div className={`h-9 w-9 rounded-full ${solidAvatarColor(member.initials)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                                                            {member.initials}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold text-foreground truncate">{member.name}</div>
                                                            <div className="text-xs text-muted-foreground">{member.role}</div>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Footer · Cancel */}
                                <div className="px-6 py-3 border-t border-border flex justify-end bg-card">
                                    <button
                                        type="button"
                                        onClick={() => { setQuery(''); onClose() }}
                                        className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
