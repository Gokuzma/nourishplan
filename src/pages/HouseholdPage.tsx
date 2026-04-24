import { useHousehold, useHouseholdMembers, useMemberProfiles } from '../hooks/useHousehold'
import { MemberList } from '../components/household/MemberList'
import { InviteLink } from '../components/household/InviteLink'
import { MemberProfileForm } from '../components/household/MemberProfileForm'
import { Nameplate, StoryHead, SectionHead, Folio, Rule } from '../components/editorial'

export function HouseholdPage() {
  const { data: membership, isPending } = useHousehold()
  const { data: members = [] } = useHouseholdMembers()
  const { data: profiles = [] } = useMemberProfiles()

  if (isPending) {
    return (
      <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 font-sans">
        <p className="serif-italic" style={{ fontSize: 16, color: 'var(--ink-soft)' }}>Loading…</p>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 font-sans">
        <Nameplate left="—" title="The Table" right="—" />
        <p className="serif-italic mt-6" style={{ fontSize: 18, color: 'var(--ink-soft)', textAlign: 'center', padding: 60 }}>
          — you are not in a household yet —
        </p>
      </div>
    )
  }

  const household = membership.households
  const isAdmin = membership.role === 'admin'
  const adminCount = members.filter(m => m.role === 'admin').length
  const memberCount = members.filter(m => m.role !== 'admin').length
  const total = members.length + profiles.length

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate */}
      <div className="hidden md:block">
        <Nameplate
          left={household?.name ? household.name.toUpperCase() : '—'}
          title={<>The <span className="amp">Table</span></>}
          right={`${total} at the table`}
        />
      </div>
      <div className="md:hidden">
        <Nameplate
          left="FAM"
          title="The Table"
          right={String(total)}
          size="sm"
        />
      </div>

      <StoryHead
        kicker="HOUSEHOLD"
        headline="The Table"
        byline={`${adminCount} admin${adminCount === 1 ? '' : 's'} · ${memberCount} member${memberCount === 1 ? '' : 's'}\n${household?.name ?? ''}`.trim()}
        size="sm"
      />

      {/* 2-col layout on desktop, stacked on mobile */}
      <div className="grid gap-0 md:gap-8 mt-4" style={{ gridTemplateColumns: '1fr' }}>
        <div className="md:grid md:gap-8" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* LEFT — members ledger */}
          <div>
            <SectionHead
              no="a"
              label="At the table"
              aux={`${total} ${total === 1 ? 'person' : 'people'} · your role: ${membership.role}`}
            />
            <Rule />
            <div className="py-2">
              <MemberList />
            </div>

            {/* Invite block — admins only */}
            {isAdmin && (
              <>
                <SectionHead no="b" label="Invite to the household" />
                <Rule />
                <div
                  className="mt-4"
                  style={{
                    padding: 20,
                    border: '1.5px dashed var(--rule-c)',
                    background: 'rgba(217, 232, 90, 0.05)',
                  }}
                >
                  <InviteLink />
                </div>

                <SectionHead no="c" label="Managed profiles" aux="children & dependents" />
                <Rule />
                <p className="serif-italic mt-3" style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
                  Add children or other members whose nutrition you manage.
                </p>
                <div className="mt-4">
                  <MemberProfileForm />
                </div>
              </>
            )}
          </div>

          {/* RIGHT — household ledger (desktop only) */}
          <div className="hidden md:block">
            <SectionHead no={isAdmin ? 'd' : 'b'} label="Household ledger" />
            <Rule />
            <div className="py-3">
              <LedgerRow k="Established" v={household?.created_at ? new Date(household.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'} />
              <LedgerRow k="People" v={`${members.length} member${members.length === 1 ? '' : 's'}${profiles.length > 0 ? ` + ${profiles.length} managed` : ''}`} />
              <LedgerRow k="Admins" v={String(adminCount)} />
              <LedgerRow k="Your role" v={membership.role.charAt(0).toUpperCase() + membership.role.slice(1)} />
              {household?.weekly_budget != null && (
                <LedgerRow k="Weekly budget" v={`$${household.weekly_budget.toFixed(0)}`} />
              )}
              {household?.week_start_day != null && (
                <LedgerRow
                  k="Week starts"
                  v={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][household.week_start_day]}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Folio — desktop only */}
      <div className="hidden md:block">
        <Folio
          num="08"
          title="The Table"
          tagline="The people this plan is for."
          pageOf="PAGE 8 OF 10"
        />
      </div>
    </div>
  )
}

function LedgerRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: '1fr auto',
        padding: '10px 0',
        borderBottom: '1px dashed var(--rule-softer)',
        alignItems: 'baseline',
      }}
    >
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>{k}</span>
      <span className="serif" style={{ fontSize: 16 }}>{v}</span>
    </div>
  )
}
