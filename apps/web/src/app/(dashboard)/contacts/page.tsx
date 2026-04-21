"use client";

/**
 * Contacts Page
 * Contact directory with table view, search, filters, and sorting
 * Connected to real database via /api/contacts
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Plus, SearchLg, Edit01, Trash01, ChevronRight, UserPlus01, UploadCloud02, Settings01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { InputBase } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import type { BadgeColor } from "@/components/base/badges/badges";
import type { BadgeTypes } from "@/components/base/badges/badge-types";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { ConfirmDeleteDialog } from "@/components/application/confirm-delete-dialog";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import {
  categoryColors,
  categoryLabels,
  getInitials,
  type Contact,
} from "./_components/contacts-data";
import { ContactSlideout } from "./_components/contact-slideout";
import { AddContactSlideout } from "./_components/add-contact-slideout";
import { ImportContactsModal } from "./_components/import-contacts-modal";
import { useContacts, type DatabaseContact, type CreateContactData, type UpdateContactData } from "@/hooks/useContacts";
import { notify } from "@/lib/notifications";

// Convert database contact to UI contact format
const convertToUIContact = (dbContact: DatabaseContact): Contact => ({
  id: dbContact.id,
  name: dbContact.full_name,
  company: dbContact.company,
  title: dbContact.title || "",
  email: dbContact.email,
  additionalEmails: dbContact.additional_emails || undefined,
  phone: dbContact.phone || "",
  category: dbContact.category as Contact["category"],
  tags: dbContact.tags || undefined,
  notes: dbContact.relationship_notes || undefined,
  lastContact: dbContact.last_contacted_at
    ? new Date(dbContact.last_contacted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined,
  birthday: (dbContact as any).birthday || undefined,
  timezone: (dbContact as any).timezone || undefined,
  linkedinUrl: (dbContact as any).linkedin_url || undefined,
});

const ITEMS_PER_PAGE = 10;

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [slideoutMode, setSlideoutMode] = useState<"view" | "edit">("view");
  const [isSlideoutOpen, setIsSlideoutOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Delete confirmation
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteContactName, setDeleteContactName] = useState("");
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteGroupName, setDeleteGroupName] = useState("");

  // Contact groups management
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [contactGroups, setContactGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts/groups');
      if (res.ok) {
        const result = await res.json();
        const groups = result.data?.data ?? result.data ?? result;
        if (Array.isArray(groups)) setContactGroups(groups);
      }
    } catch (err) {
      console.error('Failed to fetch contact groups:', err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/api/contacts/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (res.ok) {
        setNewGroupName("");
        fetchGroups();
        notify.success('Group added', `"${newGroupName.trim()}" has been created.`);
      }
    } catch (err) {
      notify.error('Error', 'Failed to add group.');
    }
  };

  const handleRenameGroup = async (id: string) => {
    if (!editingGroupName.trim()) return;
    try {
      const res = await fetch('/api/contacts/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingGroupName.trim() }),
      });
      if (res.ok) {
        setEditingGroupId(null);
        fetchGroups();
        notify.success('Group renamed', 'The group has been updated.');
      }
    } catch (err) {
      notify.error('Error', 'Failed to rename group.');
    }
  };

  const promptDeleteGroup = (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      notify.error('Cannot delete', 'Default groups can only be renamed.');
      return;
    }
    setDeleteGroupId(id);
    setDeleteGroupName(name);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      const res = await fetch('/api/contacts/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteGroupId }),
      });
      if (res.ok) {
        fetchGroups();
        notify.success('Group deleted', 'The group has been removed.');
      }
    } catch (err) {
      notify.error('Error', 'Failed to delete group.');
    } finally {
      setDeleteGroupId(null);
      setDeleteGroupName('');
    }
  };

  // Fetch contacts from database
  const { contacts: dbContacts, isLoading, stats, createContact, updateContact, deleteContact, refetch } = useContacts();

  // Convert database contacts to UI format
  const contacts = useMemo(() => {
    if (Array.isArray(dbContacts)) {
      return dbContacts.map(convertToUIContact);
    }
    return [];
  }, [dbContacts]);

  // Handle adding a new contact
  const handleAddContact = useCallback(async (contactData: Omit<Contact, "id">) => {
    try {
      const createData: CreateContactData = {
        full_name: contactData.name,
        email: contactData.email,
        additional_emails: contactData.additionalEmails?.length ? contactData.additionalEmails : undefined,
        company: contactData.company || "",
        title: contactData.title,
        phone: contactData.phone,
        category: contactData.category,
        tags: contactData.tags,
        relationship_notes: contactData.notes,
        birthday: contactData.birthday,
        timezone: contactData.timezone,
        linkedin_url: contactData.linkedinUrl,
      } as any;

      await createContact(createData);
      notify.success('Contact created', 'The contact has been added to your directory.');
    } catch (err) {
      console.error('Failed to create contact:', err);
      notify.error('Failed to create contact', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createContact]);

  // Handle updating a contact
  const handleSaveContact = useCallback(async (contact: Contact) => {
    try {
      const updateData: UpdateContactData = {
        full_name: contact.name,
        email: contact.email,
        additional_emails: contact.additionalEmails?.length ? contact.additionalEmails : null,
        company: contact.company,
        title: contact.title,
        phone: contact.phone,
        category: contact.category,
        tags: contact.tags,
        relationship_notes: contact.notes,
        birthday: contact.birthday || null,
        timezone: contact.timezone || null,
        linkedin_url: contact.linkedinUrl || null,
      };

      await updateContact(contact.id, updateData);
      notify.success('Contact updated', 'The contact has been updated.');
      setIsSlideoutOpen(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
      notify.error('Failed to update contact', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [updateContact]);

  // Handle deleting a contact (show confirmation first)
  const promptDeleteContact = useCallback((contactId: string, contactName?: string) => {
    setDeleteContactId(contactId);
    setDeleteContactName(contactName || '');
  }, []);

  const confirmDeleteContact = useCallback(async () => {
    if (!deleteContactId) return;
    try {
      await deleteContact(deleteContactId);
      notify.success('Contact deleted', 'The contact has been removed from your directory.');
    } catch (err) {
      console.error('Failed to delete contact:', err);
      notify.error('Failed to delete contact', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeleteContactId(null);
      setDeleteContactName('');
    }
  }, [deleteContact, deleteContactId]);

  const filteredContacts = useMemo(() => {
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    let filtered = [...safeContacts];

    if (activeCategory !== "all") {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [contacts, activeCategory, searchQuery]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof Contact];
      const second = b[sortDescriptor.column as keyof Contact];

      if (typeof first === "string" && typeof second === "string") {
        let cmp = first.localeCompare(second);
        if (sortDescriptor.direction === "descending") {
          cmp *= -1;
        }
        return cmp;
      }
      return 0;
    });
  }, [filteredContacts, sortDescriptor]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedContacts, currentPage]);

  const totalPages = Math.ceil(sortedContacts.length / ITEMS_PER_PAGE);

  const categoryCounts = useMemo(() => {
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const counts: Record<string, number> = { all: safeContacts.length };
    safeContacts.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Contacts</h1>
          <p className="text-sm text-tertiary">{contacts.length} contacts in your directory</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" color="secondary" iconLeading={Settings01} onClick={() => setIsGroupsModalOpen(true)}>
            Manage Groups
          </Button>
          <Dropdown.Root>
            <Button size="md" color="primary" iconLeading={Plus}>
              Add Contact
            </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => {
              if (key === "manual") setIsAddContactOpen(true);
              if (key === "import") setIsImportModalOpen(true);
            }}>
              <Dropdown.Item id="manual" label="Add Manually" icon={UserPlus01} />
              <Dropdown.Item id="import" label="Import CSV" icon={UploadCloud02} />
            </Dropdown.Menu>
          </Dropdown.Popover>
          </Dropdown.Root>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={activeCategory}
        onSelectionChange={(key) => {
          setActiveCategory(key as string);
          setCurrentPage(1);
        }}
      >
        <TabList
          type="button-minimal"
          items={[
            { id: "all", label: `All (${categoryCounts.all || 0})` },
            { id: "vip", label: `VIP (${categoryCounts.vip || 0})` },
            { id: "client", label: `Clients (${categoryCounts.client || 0})` },
            { id: "vendor", label: `Vendors (${categoryCounts.vendor || 0})` },
            { id: "partner", label: `Partners (${categoryCounts.partner || 0})` },
            { id: "personal", label: `Personal (${categoryCounts.personal || 0})` },
          ]}
        />
      </Tabs>

      {/* Table */}
      <TableCard.Root>
        <TableCard.Header
          title="Contact Directory"
          badge={`${sortedContacts.length} contacts`}
          contentTrailing={
            <div className="absolute top-5 right-4 md:right-6 flex items-center gap-3">
              <div className="w-64">
                <InputBase
                  size="sm"
                  type="search"
                  aria-label="Search"
                  placeholder="Search contacts..."
                  icon={SearchLg}
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <TableRowActionsDropdown />
            </div>
          }
        />
        <Table
          aria-label="Contacts"
          selectionMode="multiple"
          selectionBehavior="toggle"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          onRowAction={(key) => {
            const contact = paginatedContacts.find((c) => c.id === key);
            if (contact) {
              setSelectedContact(contact);
              setSlideoutMode("view");
              setIsSlideoutOpen(true);
            }
          }}
        >
          <Table.Header>
            <Table.Head id="name" label="Name" isRowHeader allowsSorting className="w-full max-w-1/4" />
            <Table.Head id="category" label="Category" allowsSorting />
            <Table.Head id="company" label="Company" allowsSorting />
            <Table.Head id="email" label="Email" allowsSorting className="md:hidden xl:table-cell" />
            <Table.Head id="phone" label="Phone" />
            <Table.Head id="tags" label="Tags" />
            <Table.Head id="actions" />
          </Table.Header>

          <Table.Body items={paginatedContacts}>
            {(contact) => (
              <Table.Row id={contact.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar initials={getInitials(contact.name)} alt={contact.name} size="md" />
                    <div className="whitespace-nowrap">
                      <p className="text-sm font-medium text-primary">{contact.name}</p>
                      <p className="text-sm text-tertiary">{contact.title}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <BadgeWithDot
                    size="sm"
                    color={categoryColors[contact.category] as BadgeColor<BadgeTypes>}
                    type="pill-color"
                  >
                    {categoryLabels[contact.category]}
                  </BadgeWithDot>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">{contact.company}</Table.Cell>
                <Table.Cell className="whitespace-nowrap md:hidden xl:table-cell">{contact.email}</Table.Cell>
                <Table.Cell className="whitespace-nowrap">{contact.phone}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-1">
                    {contact.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} color="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags && contact.tags.length > 2 && (
                      <Badge color="gray" size="sm">
                        +{contact.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="px-4">
                  <div className="flex justify-end gap-0.5">
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="Delete" 
                      icon={Trash01}
                      onClick={() => promptDeleteContact(contact.id, contact.name)}
                    />
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="Edit" 
                      icon={Edit01}
                      onClick={() => {
                        setSelectedContact(contact);
                        setSlideoutMode("edit");
                        setIsSlideoutOpen(true);
                      }}
                    />
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="View Details" 
                      icon={ChevronRight}
                      onClick={() => {
                        setSelectedContact(contact);
                        setSlideoutMode("view");
                        setIsSlideoutOpen(true);
                      }}
                    />
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        {totalPages > 1 && (
          <PaginationPageMinimalCenter
            page={currentPage}
            total={totalPages}
            onPageChange={setCurrentPage}
            className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
          />
        )}
      </TableCard.Root>

      {/* Contact Slideout */}
      <ContactSlideout
        contact={selectedContact}
        isOpen={isSlideoutOpen}
        onOpenChange={setIsSlideoutOpen}
        mode={slideoutMode}
        onSave={handleSaveContact}
      />

      {/* Add Contact Slideout */}
      <AddContactSlideout
        isOpen={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        onSubmit={handleAddContact}
      />

      {/* Import Contacts Modal */}
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={refetch}
      />

      {/* Manage Groups Modal */}
      {isGroupsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsGroupsModalOpen(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Contact Groups</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add, rename, or remove contact groups. Default groups can only be renamed.</p>
            </div>

            <div className="mb-4 max-h-64 overflow-y-auto">
              {contactGroups.map((grp) => (
                <div key={grp.id} className="flex items-center justify-between border-b border-gray-100 py-2.5 dark:border-gray-800 last:border-b-0">
                  {editingGroupId === grp.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(grp.id); if (e.key === 'Escape') setEditingGroupId(null); }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                      />
                      <Button size="sm" color="primary" onClick={() => handleRenameGroup(grp.id)}>Save</Button>
                      <Button size="sm" color="secondary" onClick={() => setEditingGroupId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{grp.name}</span>
                        {grp.is_default && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingGroupId(grp.id); setEditingGroupName(grp.name); }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title="Rename"
                        >
                          <Edit01 className="h-4 w-4" />
                        </button>
                        {!grp.is_default && (
                          <button
                            onClick={() => promptDeleteGroup(grp.id, grp.name, grp.is_default)}
                            className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                            title="Delete"
                          >
                            <Trash01 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {contactGroups.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No groups yet. Add one below.</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <input
                type="text"
                placeholder="New group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
              <Button size="sm" color="primary" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                Add
              </Button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" color="secondary" onClick={() => setIsGroupsModalOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteContactId}
        onClose={() => { setDeleteContactId(null); setDeleteContactName(''); }}
        onConfirm={confirmDeleteContact}
        title="Delete Contact"
        itemName={deleteContactName}
      />

      {/* Delete Group Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteGroupId}
        onClose={() => { setDeleteGroupId(null); setDeleteGroupName(''); }}
        onConfirm={confirmDeleteGroup}
        title="Delete Group"
        itemName={deleteGroupName}
      />
    </div>
  );
}
