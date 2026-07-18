'use client'

import React, { useState, useTransition } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building, 
  User, 
  Users, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  Check, 
  Building2 
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  updateUserProfile, 
  createNewCompany, 
  addMemberToCompany, 
  removeMemberFromCompany, 
  updateMemberRole,
  switchCompany 
} from '@/app/actions'

interface Member {
  user_id: string
  email: string
  role: 'owner' | 'admin' | 'accountant' | 'viewer'
  display_name: string
}

interface SettingsClientProps {
  currentUser: {
    id: string
    email: string
    displayName: string
  }
  companyInfo: {
    id: string
    name: string
    role: string
    allCompanies: Array<{
      id: string
      name: string
      role: string
    }>
  }
  members: Member[]
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Kurucu Sahibi',
  admin: 'Yönetici',
  accountant: 'Muhasebeci',
  viewer: 'Gözlemci (Sadece İzler)'
}

export function SettingsClient({ currentUser, companyInfo, members }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [isPending, startTransition] = useTransition()

  // Profile Edit State
  const [displayName, setDisplayName] = useState(currentUser.displayName)

  // New Company State
  const [newCompanyName, setNewCompanyName] = useState('')
  const [showCompanyModal, setShowCompanyModal] = useState(false)

  // New Member State
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('accountant')
  const [showMemberModal, setShowMemberModal] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      toast.error('Ad Soyad alanı boş olamaz.')
      return
    }

    startTransition(async () => {
      const res = await updateUserProfile(displayName)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Profil bilgileriniz güncellendi!')
      }
    })
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompanyName.trim()) {
      toast.error('Şirket adı boş olamaz.')
      return
    }

    startTransition(async () => {
      const res = await createNewCompany(newCompanyName)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Yeni şirket başarıyla oluşturuldu ve geçiş yapıldı!')
        setNewCompanyName('')
        setShowCompanyModal(false)
      }
    })
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) {
      toast.error('E-posta adresi boş olamaz.')
      return
    }

    startTransition(async () => {
      const res = await addMemberToCompany(newMemberEmail, newMemberRole)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kullanıcı şirkete başarıyla davet edildi/eklendi!')
        setNewMemberEmail('')
        setShowMemberModal(false)
      }
    })
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Bu kullanıcının şirkete erişim yetkisini kaldırmak istediğinize emin misiniz?')) {
      return
    }

    startTransition(async () => {
      const res = await removeMemberFromCompany(userId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kullanıcı erişimi başarıyla kaldırıldı!')
      }
    })
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    startTransition(async () => {
      const res = await updateMemberRole(userId, newRole)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kullanıcı yetkisi güncellendi!')
      }
    })
  }

  const handleSwitchCompany = (id: string) => {
    startTransition(() => {
      switchCompany(id)
    })
  }

  const canManageMembers = companyInfo.role === 'owner' || companyInfo.role === 'admin'

  return (
    <div className="space-y-6 pb-24 animate-in-up">
      <PageHeader
        title="Ayarlar & Yönetim"
        description="Profilinizi düzenleyin, şirketleriniz arasında geçiş yapın veya üyelerinizi yönetin"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-14 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="profile" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <User className="w-4 h-4 mr-2" />
            Profilim
          </TabsTrigger>
          <TabsTrigger value="companies" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building className="w-4 h-4 mr-2" />
            Şirketlerim
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            Şirket Üyeleri ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Kullanıcı Bilgilerim</CardTitle>
              <CardDescription>Uygulamada görünen adınızı ve kişisel ayarlarınızı güncelleyin</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">E-Posta Adresi (Giriş)</Label>
                  <Input 
                    type="email" 
                    id="email" 
                    value={currentUser.email} 
                    disabled 
                    className="h-10 rounded-lg bg-muted text-muted-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="displayName" className="text-xs">Adınız Soyadınız / Kullanıcı Adı</Label>
                  <Input 
                    type="text" 
                    id="displayName" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="örn: Selim Albayrak"
                    className="h-10 rounded-lg"
                    required
                  />
                </div>
                <Button type="submit" disabled={isPending} className="rounded-xl px-6 cursor-pointer">
                  {isPending ? 'Güncelleniyor...' : 'Profil Bilgilerini Kaydet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="mt-6 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg">Erişiminiz Olan Şirketler</CardTitle>
                <CardDescription>Aktif şirketini seçebilir veya yeni şirket ekleyebilirsiniz</CardDescription>
              </div>
              <Button onClick={() => setShowCompanyModal(true)} size="sm" className="rounded-xl">
                <Plus className="w-4 h-4 mr-1.5" /> Yeni Şirket
              </Button>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {companyInfo.allCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[c.role] || c.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.id === companyInfo.id ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Aktif
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSwitchCompany(c.id)}
                        disabled={isPending}
                        className="rounded-xl cursor-pointer"
                      >
                        Geçiş Yap
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg">Şirket Yetkilendirmeleri</CardTitle>
                <CardDescription><strong>{companyInfo.name}</strong> şirketine erişimi olan tüm kullanıcılar</CardDescription>
              </div>
              {canManageMembers && (
                <Button onClick={() => setShowMemberModal(true)} size="sm" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1.5" /> Kullanıcı Davet Et / Ekle
                </Button>
              )}
            </CardHeader>
            <CardContent className="divide-y p-0">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Kullanıcı kaydı bulunamadı</p>
              ) : (
                members.map((m) => {
                  const isSelf = m.user_id === currentUser.id
                  const isOwner = m.role === 'owner'
                  
                  return (
                    <div key={m.user_id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
                          {isOwner ? <ShieldCheck className="w-5 h-5 text-indigo-500" /> : <UserCheck className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {m.display_name || 'İsimsiz Kullanıcı'} {isSelf && <span className="text-xs text-muted-foreground">(Siz)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Role switcher (Only for owners/admins modifying other users) */}
                        {canManageMembers && !isSelf && !isOwner ? (
                          <Select 
                            value={m.role} 
                            onValueChange={(val) => handleUpdateRole(m.user_id, val as string)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border">
                              <SelectItem value="admin">Yönetici</SelectItem>
                              <SelectItem value="accountant">Muhasebeci</SelectItem>
                              <SelectItem value="viewer">Gözlemci</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                            {ROLE_LABELS[m.role] || m.role}
                          </span>
                        )}

                        {/* Remove action */}
                        {canManageMembers && !isSelf && !isOwner && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMember(m.user_id)}
                            disabled={isPending}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 h-8 w-8 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Company Dialog */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCompanyModal(false)} />
          <form onSubmit={handleCreateCompany} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <Building className="w-5 h-5" />
              Yeni Şirket Oluştur
            </h3>
            <div className="space-y-1">
              <Label htmlFor="companyName" className="text-xs">Şirket Ünvanı / Adı</Label>
              <Input 
                type="text" 
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="örn: Albayrak Metal Ltd. Şti."
                className="h-10 rounded-lg"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowCompanyModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                Oluştur & Geç
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* New Member Dialog */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMemberModal(false)} />
          <form onSubmit={handleAddMember} className="relative bg-card border w-full max-w-md p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Kullanıcı Yetkilendir
            </h3>
            <p className="text-xs text-muted-foreground">
              Şirkete eklemek istediğiniz kullanıcının Supabase üzerinde kayıtlı mail adresini girin.
            </p>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="memberEmail" className="text-xs">E-Posta Adresi</Label>
                <Input 
                  type="email" 
                  id="memberEmail"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="isim@example.com"
                  className="h-10 rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rol / Yetki Seviyesi</Label>
                <Select value={newMemberRole} onValueChange={(val) => setNewMemberRole(val || '')}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="admin">Yönetici (Kullanıcı ekleyebilir/düzenleyebilir)</SelectItem>
                    <SelectItem value="accountant">Muhasebeci (Kayıt ekleyebilir, yetki yönetemez)</SelectItem>
                    <SelectItem value="viewer">Gözlemci (Sadece verileri görebilir)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowMemberModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                Ekle
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
