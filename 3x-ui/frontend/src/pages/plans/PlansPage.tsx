import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { EllipsisOutlined } from '@ant-design/icons';
import { PANEL_ROUTES } from '@/routes/panelRoutes';
import {
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { PlanCard, PnStatTile, ResponsiveSheet, type PlanModel } from '@/components/pn';

function PlansNavigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const moreRoutes = PANEL_ROUTES.slice(4);
  const isCurrent = (path: string) =>
    path === '/' ? pathname === '/' || pathname === '/panel' : pathname.endsWith(path);
  const moreItems = moreRoutes.map(({ path, titleKey, icon: Icon }) => ({
    key: path,
    icon: <Icon aria-hidden />,
    label: t(titleKey, { defaultValue: path.slice(1).replaceAll('-', ' ') }),
  }));
  const moreActive = moreRoutes.some(({ path }) => isCurrent(path));

  return (
    <nav className="pn-plans-nav" aria-label={t('menu.mobileNavigation', { defaultValue: 'Panel pages' })}>
      <div className="pn-nav-brand">3X-UI</div>
      {PANEL_ROUTES.map(({ path, titleKey, icon: Icon }) => (
        <button
          key={path}
          type="button"
          className={`pn-nav-link${isCurrent(path) ? ' active' : ''}`}
          aria-current={isCurrent(path) ? 'page' : undefined}
          onClick={() => navigate(path)}
        >
          <Icon aria-hidden />
          <span>{t(titleKey, { defaultValue: path === '/' ? 'Overview' : path.slice(1) })}</span>
        </button>
      ))}
      <Dropdown
        placement="topRight"
        trigger={['click']}
        menu={{ items: moreItems, onClick: ({ key }) => navigate(String(key)) }}
      >
        <button
          type="button"
          className={`pn-nav-more${moreActive ? ' active' : ''}`}
          aria-label={t('common.more', { defaultValue: 'More' })}
          aria-haspopup="menu"
        >
          <EllipsisOutlined aria-hidden />
          <span>{t('common.more', { defaultValue: 'More' })}</span>
        </button>
      </Dropdown>
    </nav>
  );
}

type PlanDraft = Omit<PlanModel, 'id' | 'clientsCount'> & { applyToExistingClients?: boolean };
type ClientDraft = {
  email: string;
  planId: number | string;
  telegramId?: string;
  group?: string;
  inbounds?: string[];
};

const EMPTY_PLAN: PlanDraft = {
  name: '',
  totalGB: 0,
  durationDays: 0,
  limitIp: 0,
  hwidLimit: 0,
  trafficReset: 'never',
  startAfterFirstUse: false,
  applyToExistingClients: false,
};

let nextPlanDraftId = 1;

export default function PlansPage() {
  const { t } = useTranslation();
  const label = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [plans, setPlans] = useState<PlanModel[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanModel | null>(null);
  const [editor, setEditor] = useState<'create' | 'edit' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'keys'>('clients');
  const [form] = Form.useForm<PlanDraft>();
  const [clientForm] = Form.useForm<ClientDraft>();
  const clients = useMemo(
    () => plans.reduce((sum, plan) => sum + (plan.clientsCount ?? 0), 0),
    [plans],
  );

  const closeEditor = () => {
    setEditor(null);
    form.resetFields();
  };
  const createPlan = () => {
    form.setFieldsValue(EMPTY_PLAN);
    setEditor('create');
  };
  const editPlan = (plan: PlanModel) => {
    form.setFieldsValue({ ...EMPTY_PLAN, ...plan, applyToExistingClients: false });
    setEditor('edit');
  };
  const savePlan = async () => {
    const values = await form.validateFields();
    if (editor === 'edit' && selectedPlan) {
      setPlans((current) =>
        current.map((plan) => (plan.id === selectedPlan.id ? { ...plan, ...values } : plan)),
      );
      setSelectedPlan((current) => (current ? { ...current, ...values } : current));
      message.info(
        label('plans.localSave', 'Plan UI saved locally; client updates need the backend API.'),
      );
    } else {
      const plan: PlanModel = { ...values, id: nextPlanDraftId++, clientsCount: 0 };
      setPlans((current) => [...current, plan]);
      message.success(label('plans.created', 'Plan added to this preview.'));
    }
    closeEditor();
  };
  const deletePlan = () => {
    if (selectedPlan) setPlans((current) => current.filter((plan) => plan.id !== selectedPlan.id));
    setSelectedPlan(null);
    setDeleteOpen(false);
  };
  const openAddClient = () => {
    clientForm.setFieldsValue({ email: '', planId: selectedPlan?.id ?? '' });
    setClientOpen(true);
  };
  const submitClient = async () => {
    await clientForm.validateFields();
    message.info(
      label('plans.clientApiPending', 'Client creation is ready for the backend API connection.'),
    );
    setClientOpen(false);
  };

  const sheetFooter = (onCancel: () => void, onSave: () => void, saveText: string) => (
    <div className="act pn-sheet-footer">
      <Button onClick={onCancel}>{label('common.cancel', 'Cancel')}</Button>
      <Button type="primary" onClick={onSave}>
        {saveText}
      </Button>
    </div>
  );

  if (selectedPlan)
    return (
      <div className="pn-page">
      <PlansNavigation />
        <header className="hd">
          <div className="t">
            <h1>{selectedPlan.name}</h1>
            <p>{label('plans.detailSubtitle', 'Plan rules and assigned clients')}</p>
          </div>
          <Space wrap>
            <Button onClick={() => setSelectedPlan(null)}>{label('common.back', 'Back')}</Button>
            <Button onClick={() => editPlan(selectedPlan)}>
              {label('common.edit', 'Edit plan')}
            </Button>
            <Button type="primary" onClick={openAddClient}>
              {label('plans.addClient', 'Add client')}
            </Button>
          </Space>
        </header>
        <div className="wrap">
          <div className="g2 pn-plan-stats">
            <PnStatTile
              label={label('plans.traffic', 'Traffic')}
              value={selectedPlan.totalGB === 0 ? '∞' : selectedPlan.totalGB + ' GB'}
              hint={label('plans.reusableRule', 'Reusable rule')}
            />
            <PnStatTile
              label={label('plans.duration', 'Duration')}
              value={
                selectedPlan.durationDays === 0
                  ? label('plans.noExpiry', 'No expiry')
                  : selectedPlan.durationDays + ' days'
              }
            />
            <PnStatTile
              label={label('plans.clients', 'Clients')}
              value={selectedPlan.clientsCount ?? 0}
            />
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'clients' | 'keys')}
            items={[
              {
                key: 'clients',
                label: label('plans.clients', 'Clients'),
                children: (
                  <div className="pn-empty-state">
                    <Empty description={label('plans.noClients', 'No clients use this plan yet')} />
                    <Button type="primary" onClick={openAddClient}>
                      {label('plans.addClient', 'Add client')}
                    </Button>
                  </div>
                ),
              },
              {
                key: 'keys',
                label: label('plans.keys', 'Keys'),
                children: (
                  <div className="pn-empty-state">
                    <Empty
                      description={label(
                        'plans.keysPending',
                        'Subscription keys appear after clients are assigned',
                      )}
                    />
                    <Space>
                      <Button disabled>{label('plans.copyAllKeys', 'Copy all keys')}</Button>
                      <Button disabled>{label('common.export', 'Export')}</Button>
                    </Space>
                  </div>
                ),
              },
            ]}
          />
          <div className="pn-plan-rule-summary">
            <b>{label('plans.rules', 'Plan rules')}</b>
            <div className="kv">
              <span>{label('plans.ipLimit', 'IP limit')}</span>
              <span>{selectedPlan.limitIp || '∞'}</span>
            </div>
            <div className="kv">
              <span>{label('plans.hwidLimit', 'HWID limit')}</span>
              <span>{selectedPlan.hwidLimit || '∞'}</span>
            </div>
            <div className="kv">
              <span>{label('plans.trafficReset', 'Traffic reset')}</span>
              <span>{selectedPlan.trafficReset ?? 'never'}</span>
            </div>
            <div className="kv">
              <span>{label('plans.startAfterFirstUse', 'Start after first use')}</span>
              <span>
                {selectedPlan.startAfterFirstUse
                  ? label('common.yes', 'Yes')
                  : label('common.no', 'No')}
              </span>
            </div>
          </div>
          <Button danger onClick={() => setDeleteOpen(true)}>
            {label('plans.delete', 'Delete plan')}
          </Button>
        </div>
        <ResponsiveSheet
          open={editor !== null}
          title={
            editor === 'edit'
              ? label('plans.editTitle', 'Edit plan')
              : label('plans.newTitle', 'New plan')
          }
          onClose={closeEditor}
          footer={sheetFooter(closeEditor, () => void savePlan(), label('common.save', 'Save'))}
        >
          <Form form={form} layout="vertical" initialValues={EMPTY_PLAN}>
            <Form.Item
              name="name"
              label={label('common.name', 'Name')}
              rules={[{ required: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <div className="pn-form-grid">
              <Form.Item
                name="totalGB"
                label={label('plans.trafficGB', 'Traffic (GB)')}
                extra={label('plans.zeroUnlimited', '0 means unlimited')}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="durationDays"
                label={label('plans.durationDays', 'Duration (days)')}
                extra={label('plans.zeroNoExpiry', '0 means no expiry')}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="limitIp" label={label('plans.ipLimit', 'IP limit')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="hwidLimit" label={label('plans.hwidLimit', 'HWID limit')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <Form.Item name="trafficReset" label={label('plans.trafficReset', 'Traffic reset')}>
              <Select
                options={['never', 'hourly', 'daily', 'weekly', 'monthly'].map((value) => ({
                  value,
                  label: label('plans.reset.' + value, value),
                }))}
              />
            </Form.Item>
            <Form.Item name="startAfterFirstUse" valuePropName="checked">
              <Switch aria-label={label('plans.startAfterFirstUse', 'Start after first use')} />{' '}
              <span>{label('plans.startAfterFirstUse', 'Start after first use')}</span>
            </Form.Item>
            {editor === 'edit' && (
              <Form.Item name="applyToExistingClients" valuePropName="checked">
                <Switch
                  aria-label={label('plans.applyExisting', 'Apply changes to existing clients')}
                />{' '}
                <span>{label('plans.applyExisting', 'Apply changes to existing clients')}</span>
              </Form.Item>
            )}
          </Form>
        </ResponsiveSheet>
        <ResponsiveSheet
          open={deleteOpen}
          title={label('plans.deleteTitle', 'Delete plan?')}
          onClose={() => setDeleteOpen(false)}
          footer={sheetFooter(
            () => setDeleteOpen(false),
            deletePlan,
            label('plans.delete', 'Delete plan'),
          )}
        >
          <p>
            {label(
              'plans.deleteNotice',
              'Assigned clients keep their current limits and become unassigned.',
            )}
          </p>
        </ResponsiveSheet>
        <ResponsiveSheet
          open={clientOpen}
          title={label('plans.addClientTitle', 'Add client from plan')}
          onClose={() => setClientOpen(false)}
          footer={sheetFooter(
            () => setClientOpen(false),
            () => void submitClient(),
            label('plans.addClient', 'Add client'),
          )}
        >
          <Form form={clientForm} layout="vertical">
            <Form.Item
              name="email"
              label={label('client.email', 'Email')}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="planId" label={label('plans.plan', 'Plan')}>
              <Select options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} />
            </Form.Item>
            <Form.Item name="telegramId" label={label('client.telegramId', 'Telegram user ID')}>
              <Input />
            </Form.Item>
            <Form.Item name="group" label={label('menu.groups', 'Group')}>
              <Input />
            </Form.Item>
            <Form.Item name="inbounds" label={label('menu.inbounds', 'Inbounds')}>
              <Select
                disabled
                aria-label={label('menu.inbounds', 'Inbounds')}
                placeholder={label(
                  'plans.backendPending',
                  'Connect the backend to choose inbounds',
                )}
              />
            </Form.Item>
            <Typography.Text type="secondary">
              {label(
                'plans.rulesFromPlan',
                'Traffic, expiry, IP and HWID limits come from the selected plan.',
              )}
            </Typography.Text>
          </Form>
        </ResponsiveSheet>
      </div>
    );

  return (
    <div className="pn-page">
      <PlansNavigation />
      <header className="hd">
        <div className="t">
          <h1>{label('menu.plans', 'Plans')}</h1>
          <p>{label('plans.subtitle', 'Reusable rules for client accounts')}</p>
        </div>
        <Button type="primary" onClick={createPlan}>
          {label('plans.newTitle', 'New plan')}
        </Button>
      </header>
      <div className="wrap">
        <div className="g2 pn-plan-stats">
          <PnStatTile label={label('plans.plans', 'Plans')} value={plans.length} />
          <PnStatTile label={label('plans.online', 'Online')} value={0} color="var(--cy)" />
          <PnStatTile label={label('plans.clients', 'Clients')} value={clients} color="var(--gr)" />
        </div>
        {plans.length ? (
          <div className="g2 pn-plan-grid">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onClick={() => {
                  setSelectedPlan(plan);
                  setActiveTab('clients');
                }}
                onEdit={() => {
                  setSelectedPlan(plan);
                  editPlan(plan);
                }}
              />
            ))}
            <button className="card pn-new-plan" onClick={createPlan}>
              ＋<span>{label('plans.newTitle', 'New plan')}</span>
            </button>
          </div>
        ) : (
          <div className="pn-empty-state">
            <Empty
              description={label(
                'plans.empty',
                'Create a plan to reuse traffic, expiry and device limits',
              )}
            />
            <Button type="primary" onClick={createPlan}>
              {label('plans.newTitle', 'New plan')}
            </Button>
          </div>
        )}
      </div>
      <ResponsiveSheet
        open={editor !== null}
        title={
          editor === 'edit'
            ? label('plans.editTitle', 'Edit plan')
            : label('plans.newTitle', 'New plan')
        }
        onClose={closeEditor}
        footer={sheetFooter(closeEditor, () => void savePlan(), label('common.save', 'Save'))}
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_PLAN}>
          <Form.Item name="name" label={label('common.name', 'Name')} rules={[{ required: true }]}>
            <Input maxLength={80} />
          </Form.Item>
          <div className="pn-form-grid">
            <Form.Item
              name="totalGB"
              label={label('plans.trafficGB', 'Traffic (GB)')}
              extra={label('plans.zeroUnlimited', '0 means unlimited')}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="durationDays"
              label={label('plans.durationDays', 'Duration (days)')}
              extra={label('plans.zeroNoExpiry', '0 means no expiry')}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="limitIp" label={label('plans.ipLimit', 'IP limit')}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="hwidLimit" label={label('plans.hwidLimit', 'HWID limit')}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="trafficReset" label={label('plans.trafficReset', 'Traffic reset')}>
            <Select
              options={['never', 'hourly', 'daily', 'weekly', 'monthly'].map((value) => ({
                value,
                label: label('plans.reset.' + value, value),
              }))}
            />
          </Form.Item>
          <Form.Item name="startAfterFirstUse" valuePropName="checked">
            <Switch aria-label={label('plans.startAfterFirstUse', 'Start after first use')} />{' '}
            <span>{label('plans.startAfterFirstUse', 'Start after first use')}</span>
          </Form.Item>
        </Form>
      </ResponsiveSheet>
    </div>
  );
}
