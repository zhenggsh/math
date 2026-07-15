# Add Global Textbook Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global multi-select textbook selector in the navigation bar, backed by React Context and localStorage, with URL-Context bidirectional synchronization.

**Architecture:** A new `TextbookContext` (following the existing `AuthContext` pattern) stores selected textbook IDs and the textbook list. The `TextbookProvider` wraps the app inside `BrowserRouter` so child components can use `useNavigate` for URL replacement. `LearningPage` derives its active textbook from a unified source: URL param first (synced to Context), then Context's first selection, then empty state.

**Tech Stack:** React 19, TypeScript (strict), Ant Design 6, React Router v6, React Context, localStorage

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `web/src/contexts/TextbookContext.tsx` | Create | Global state: textbook list, selected IDs, loading, CRUD operations, localStorage persistence, stale-ID validation |
| `web/src/hooks/useTextbook.ts` | Create | Consumer hook for TextbookContext (pattern-matches `useAuth`) |
| `web/src/App.tsx` | Modify | Change `/learning/:textbookId` to optional param; wrap routes with `TextbookProvider` inside `Router` |
| `web/src/components/Layout/AppLayout.tsx` | Modify | Add `<Select mode="multiple">` textbook selector left of user avatar; update "学习" menu click to use Context |
| `web/src/pages/HomePage.tsx` | Modify | Update "知识学习" card onClick to use Context instead of direct `getTextbooks()` call |
| `web/src/pages/LearningPage/LearningPage.tsx` | Modify | Replace 7 direct `textbookId` dependencies with `activeTextbookId` derived from URL/Context; add URL-Context sync guard |

---

## Prerequisites

- The codebase is a pnpm workspace monorepo. All commands run from repo root.
- Existing auth flow: `AuthProvider` wraps `Router` in `App.tsx`. `useAuth()` hook consumes `AuthContext`.
- Existing textbook API: `getTextbooks()` in `web/src/services/textbook.service.ts` returns `Promise<Textbook[]>`.
- Existing types: `Textbook` interface has `{ id: string; name: string; ... }`.

---

## Task 1: Create TextbookContext

**Files:**
- Create: `web/src/contexts/TextbookContext.tsx`
- Create: `web/src/hooks/useTextbook.ts`

### Step 1.1: Write TextbookContext

Create `web/src/contexts/TextbookContext.tsx`:

```tsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Textbook } from '../types/textbook.types';
import { getTextbooks } from '../services/textbook.service';
import { getToken } from '../services/auth.service';

const STORAGE_KEY = 'mathtong:selected-textbooks';

export interface TextbookContextType {
  selectedTextbookIds: string[];
  textbooks: Textbook[];
  isLoading: boolean;
  selectTextbook: (id: string) => void;
  deselectTextbook: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const TextbookContext = createContext<TextbookContextType | undefined>(undefined);

export const TextbookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [selectedTextbookIds, setSelectedTextbookIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load textbooks and restore selection on mount
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getTextbooks();
        setTextbooks(data);

        // Restore from localStorage and validate against API response
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed: string[] = JSON.parse(saved);
            const validIds = parsed.filter((id) => data.some((t) => t.id === id));
            if (validIds.length > 0) {
              setSelectedTextbookIds(validIds);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(validIds));
            } else if (data.length > 0) {
              // All saved IDs invalid (deleted), fallback to first
              setSelectedTextbookIds([data[0].id]);
              localStorage.setItem(STORAGE_KEY, JSON.stringify([data[0].id]));
            }
          } catch {
            // Invalid JSON in localStorage
            if (data.length > 0) {
              setSelectedTextbookIds([data[0].id]);
              localStorage.setItem(STORAGE_KEY, JSON.stringify([data[0].id]));
            }
          }
        } else if (data.length > 0) {
          // First visit, default to first textbook
          setSelectedTextbookIds([data[0].id]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([data[0].id]));
        }
      } catch {
        // API failure: leave empty
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedTextbookIds));
    }
  }, [selectedTextbookIds, isLoading]);

  const selectTextbook = useCallback((id: string) => {
    setSelectedTextbookIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const deselectTextbook = useCallback((id: string) => {
    setSelectedTextbookIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedTextbookIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTextbookIds([]);
  }, []);

  const value = useMemo(
    () => ({
      selectedTextbookIds,
      textbooks,
      isLoading,
      selectTextbook,
      deselectTextbook,
      selectMultiple,
      clearSelection,
    }),
    [selectedTextbookIds, textbooks, isLoading, selectTextbook, deselectTextbook, selectMultiple, clearSelection]
  );

  return <TextbookContext.Provider value={value}>{children}</TextbookContext.Provider>;
};
```

### Step 1.2: Write useTextbook hook

Create `web/src/hooks/useTextbook.ts`:

```ts
import { useContext } from 'react';
import { TextbookContext } from '../contexts/TextbookContext';

export const useTextbook = () => {
  const context = useContext(TextbookContext);
  if (context === undefined) {
    throw new Error('useTextbook must be used within a TextbookProvider');
  }
  return context;
};
```

### Step 1.3: Run typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web typecheck
```

Expected: PASS (no errors from new files).

### Step 1.4: Commit

```bash
git add web/src/contexts/TextbookContext.tsx web/src/hooks/useTextbook.ts
git commit -m "feat: add TextbookContext and useTextbook hook

- Global state for textbook selection with multi-select support
- localStorage persistence with stale-ID validation
- Default to first textbook on first visit or when all saved IDs are deleted

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Update App.tsx (Routing + Provider Wrap)

**Files:**
- Modify: `web/src/App.tsx`

### Step 2.1: Change route to optional param + wrap with TextbookProvider

Edit `web/src/App.tsx`:

```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TextbookProvider } from './contexts/TextbookContext'; // ADD
// ... other imports unchanged

function App() {
  return (
    <AuthProvider>
      <Router>
        <TextbookProvider> {/* ADD: inside Router so children can use useNavigate */}
          <Routes>
            {/* Auth routes - standalone, no layout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Public home page with layout */}
            <Route
              path="/"
              element={
                <AppLayout>
                  <HomePage />
                </AppLayout>
              }
            />

            {/* Protected routes with layout */}
            <Route
              path="/teacher/textbooks"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <TextbookManagePage />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            {/* MODIFIED: optional textbookId param */}
            <Route
              path="/learning/:textbookId?"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <LearningPage />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            {/* ... other routes unchanged */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TextbookProvider> {/* ADD */}
      </Router>
    </AuthProvider>
  );
}
```

### Step 2.2: Verify typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web typecheck
```

Expected: PASS.

### Step 2.3: Commit

```bash
git add web/src/App.tsx
git commit -m "feat: wrap app with TextbookProvider, make textbookId route optional

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Update AppLayout (Selector + Menu Click)

**Files:**
- Modify: `web/src/components/Layout/AppLayout.tsx`

### Step 3.1: Add textbook selector and update menu click

Replace the full content of `web/src/components/Layout/AppLayout.tsx` (keep existing structure, modify key sections):

Key modifications to make:

1. **Import additions:**
```tsx
import { Select, Spin } from 'antd'; // add to existing antd imports
import { useTextbook } from '../../hooks/useTextbook'; // ADD
```

2. **Inside component body**, add after `useAuth()`:
```tsx
const { selectedTextbookIds, textbooks, isLoading: textbooksLoading, selectMultiple } = useTextbook();
```

3. **Update `handleMenuClick`** for `key === 'learning'`:
```tsx
if (key === 'learning') {
  if (selectedTextbookIds.length > 0) {
    void navigate(`/learning/${selectedTextbookIds[0]}`);
  } else if (textbooks.length > 0) {
    void navigate(`/learning/${textbooks[0].id}`);
  } else {
    message.warning('暂无教材，请先导入教材');
  }
  return;
}
```

4. **Add selector UI** between the Menu and the user avatar section (inside the right-side `<div>`):
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
  {isAuthenticated && (
    <Select
      mode="multiple"
      maxTagCount={2}
      style={{ minWidth: 180, maxWidth: 280 }}
      placeholder={textbooksLoading ? <Spin size="small" /> : '选择教材'}
      loading={textbooksLoading}
      disabled={textbooksLoading || textbooks.length === 0}
      value={selectedTextbookIds}
      onChange={(values: string[]) => selectMultiple(values)}
      options={textbooks.map((t) => ({ label: t.name, value: t.id }))}
    />
  )}
  {/* existing auth buttons/avatar */}
</div>
```

The full file should look like this:

```tsx
import React from 'react';
import { Layout, Menu, Button, Space, Typography, Avatar, App, Select, Spin } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  ReadOutlined,
  BulbOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTextbook } from '../../hooks/useTextbook';

const { Header, Content } = Layout;
const { Text } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/teacher/textbooks', label: '教材管理', icon: <BookOutlined /> },
  { key: 'learning', label: '学习', icon: <ReadOutlined /> },
  { key: '/smart-learning', label: '智能学习', icon: <BulbOutlined /> },
  { key: '/analytics/student', label: '分析', icon: <BarChartOutlined /> },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { selectedTextbookIds, textbooks, isLoading: textbooksLoading, selectMultiple } = useTextbook();

  const handleMenuClick = ({ key }: { key: string }): void => {
    if (key === 'learning') {
      if (selectedTextbookIds.length > 0) {
        void navigate(`/learning/${selectedTextbookIds[0]}`);
      } else if (textbooks.length > 0) {
        void navigate(`/learning/${textbooks[0].id}`);
      } else {
        message.warning('暂无教材，请先导入教材');
      }
      return;
    }
    void navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1890ff',
              cursor: 'pointer',
            }}
            onClick={(): void => {
              void navigate('/');
            }}
          >
            知识通
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderBottom: 'none', minWidth: 400 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isAuthenticated && (
            <Select
              mode="multiple"
              maxTagCount={2}
              style={{ minWidth: 180, maxWidth: 280 }}
              placeholder={textbooksLoading ? <Spin size="small" /> : '选择教材'}
              loading={textbooksLoading}
              disabled={textbooksLoading || textbooks.length === 0}
              value={selectedTextbookIds}
              onChange={(values: string[]) => selectMultiple(values)}
              options={textbooks.map((t) => ({ label: t.name, value: t.id }))}
            />
          )}
          {isAuthenticated && user ? (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{user.name || user.email}</Text>
              <Button
                type="link"
                icon={<LogoutOutlined />}
                onClick={(): void => {
                  logout();
                  void navigate('/login');
                }}
              >
                退出
              </Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="link"
                icon={<LoginOutlined />}
                onClick={(): void => {
                  void navigate('/login');
                }}
              >
                登录
              </Button>
              <Button
                type="primary"
                onClick={(): void => {
                  void navigate('/register');
                }}
              >
                注册
              </Button>
            </Space>
          )}
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f2f5' }}>{children}</Content>
    </Layout>
  );
};

export default AppLayout;
```

### Step 3.2: Run typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web typecheck
```

Expected: PASS.

### Step 3.3: Commit

```bash
git add web/src/components/Layout/AppLayout.tsx
git commit -m "feat: add textbook selector to nav bar, update learning menu to use Context

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Update HomePage

**Files:**
- Modify: `web/src/pages/HomePage.tsx`

### Step 4.1: Replace direct getTextbooks() with Context

Edit `web/src/pages/HomePage.tsx`. Change the "知识学习" card's `onClick`:

```tsx
import { useTextbook } from '../hooks/useTextbook'; // ADD import

// Inside component:
const { selectedTextbookIds, textbooks } = useTextbook(); // ADD

// In the featureCards array or inline, replace the learning card onClick:
onClick={(): void => {
  if (selectedTextbookIds.length > 0) {
    void navigate(`/learning/${selectedTextbookIds[0]}`);
  } else if (textbooks.length > 0) {
    void navigate(`/learning/${textbooks[0].id}`);
  } else {
    message.warning('暂无教材，请先导入教材');
  }
}}
```

Remove the `async` from the onClick handler and delete the `getTextbooks()` import if no longer used.

### Step 4.2: Run typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web typecheck
```

Expected: PASS.

### Step 4.3: Commit

```bash
git add web/src/pages/HomePage.tsx
git commit -m "feat: update HomePage learning card to use TextbookContext

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Refactor LearningPage (7 Dependencies + URL Sync)

**Files:**
- Modify: `web/src/pages/LearningPage/LearningPage.tsx`

### Step 5.1: Understand the 7 dependency points

Current `textbookId` usages in `LearningPage.tsx`:

| Line | Code | Replacement Strategy |
|------|------|---------------------|
| 44 | `const { textbookId } = useParams<{ textbookId?: string }>()` | Keep, rename to `urlTextbookId` |
| 70 | `else if (textbookId)` | Use `activeTextbookId` |
| 161 | `if (!textbookId)` | Use `activeTextbookId` |
| 169 | `getKnowledgeTree(textbookId)` | Use `activeTextbookId` |
| 188 | `}, [textbookId])` | Use `activeTextbookId` |
| 310 | `if (!selectedNode \|\| !textbookId)` | Use `activeTextbookId` |
| 314 | `textbookId` (save API arg) | Use `activeTextbookId` |
| 325 | `}, [selectedNode, textbookId, ...])` | Use `activeTextbookId` |
| 427 | `if (!textbookId)` | Use `activeTextbookId` |

### Step 5.2: Add imports and activeTextbookId derivation

At the top of `LearningPage.tsx`, add:

```tsx
import { useTextbook } from '../../hooks/useTextbook';
```

Inside the component, after existing hooks:

```tsx
const { selectedTextbookIds, selectMultiple, textbooks } = useTextbook();
const { textbookId: urlTextbookId } = useParams<{ textbookId?: string }>();

// Derive active textbook ID: URL param wins, else Context's first selection
const activeTextbookId = urlTextbookId ?? selectedTextbookIds[0] ?? undefined;

// URL-Context sync guard: prevent infinite loops
const lastSyncedId = useRef<string | null>(null);

useEffect(() => {
  if (activeTextbookId && lastSyncedId.current !== activeTextbookId) {
    // If URL has a different ID than Context, sync URL into Context
    if (urlTextbookId && !selectedTextbookIds.includes(urlTextbookId)) {
      lastSyncedId.current = urlTextbookId;
      selectMultiple([urlTextbookId]);
    }
  }
}, [urlTextbookId, selectedTextbookIds, selectMultiple, activeTextbookId]);
```

### Step 5.3: Replace all textbookId with activeTextbookId

Search-and-replace within `LearningPage.tsx`:

1. **Page title effect** (around line 66-78):
```tsx
// Before:
} else if (textbookId) {
  document.title = `Learning - ${baseTitle}`;
}

// After:
} else if (activeTextbookId) {
  document.title = `Learning - ${baseText}`;
}
```

2. **Data loading useEffect** (around line 159-188):
```tsx
// Before:
if (!textbookId) {
  setLoading(false);
  return;
}
// ...
const data = await knowledgeApi.getKnowledgeTree(textbookId);

// After:
if (!activeTextbookId) {
  setLoading(false);
  return;
}
// ...
const data = await knowledgeApi.getKnowledgeTree(activeTextbookId);
```

Change the dependency array from `[textbookId]` to `[activeTextbookId]`.

3. **Save content handler** (around line 309-325):
```tsx
// Before:
if (!selectedNode || !textbookId) return;
// ...
await knowledgeApi.saveKnowledgePointContent(
  textbookId,
  selectedNode.data.id,
  editedContent,
);
// ...
}, [selectedNode, textbookId, editedContent]);

// After:
if (!selectedNode || !activeTextbookId) return;
// ...
await knowledgeApi.saveKnowledgePointContent(
  activeTextbookId,
  selectedNode.data.id,
  editedContent,
);
// ...
}, [selectedNode, activeTextbookId, editedContent]);
```

4. **Empty state render** (around line 427):
```tsx
// Before:
if (!textbookId) {

// After:
if (!activeTextbookId) {
```

5. **Add URL replace when Context changes while on LearningPage**:

Add a new `useEffect` after the existing data loading effect:

```tsx
useEffect(() => {
  // When global selection changes while on LearningPage, update URL
  if (
    selectedTextbookIds.length > 0 &&
    selectedTextbookIds[0] !== urlTextbookId &&
    location.pathname.startsWith('/learning')
  ) {
    void navigate(`/learning/${selectedTextbookIds[0]}`, { replace: true });
  }
}, [selectedTextbookIds, urlTextbookId, navigate, location.pathname]);
```

### Step 5.4: Run typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web typecheck
```

Expected: PASS.

### Step 5.5: Commit

```bash
git add web/src/pages/LearningPage/LearningPage.tsx
git commit -m "feat: refactor LearningPage to use activeTextbookId with URL-Context sync

- Derive active textbook from URL param -> Context -> empty state
- Add useRef guard to prevent sync loops
- Replace all 7 direct textbookId dependencies
- Add URL replace on Context change while on LearningPage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Add Unit Tests for TextbookContext

**Files:**
- Create: `web/src/contexts/__tests__/TextbookContext.test.tsx`

### Step 6.1: Write tests

```tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TextbookProvider, TextbookContext } from '../TextbookContext';
import type { Textbook } from '../../types/textbook.types';

const mockTextbooks: Textbook[] = [
  { id: 'tb-1', name: 'Math 1', fileName: 'm1.xlsx', frameworkType: 'xlsx', hasContent: true, knowledgePointCount: 10, lastModifiedAt: '', createdAt: '' },
  { id: 'tb-2', name: 'Math 2', fileName: 'm2.xlsx', frameworkType: 'xlsx', hasContent: false, knowledgePointCount: 5, lastModifiedAt: '', createdAt: '' },
];

// Mock getTextbooks
jest.mock('../../services/textbook.service', () => ({
  getTextbooks: jest.fn(),
}));

import { getTextbooks } from '../../services/textbook.service';

const TestConsumer: React.FC = () => {
  const ctx = React.useContext(TextbookContext);
  if (!ctx) return <div>no context</div>;
  return (
    <div>
      <div data-testid="loading">{ctx.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="count">{ctx.selectedTextbookIds.length}</div>
      <div data-testid="ids">{ctx.selectedTextbookIds.join(',')}</div>
      <button onClick={() => ctx.selectTextbook('tb-2')}>select tb2</button>
      <button onClick={() => ctx.deselectTextbook('tb-1')}>deselect tb1</button>
      <button onClick={() => ctx.clearSelection()}>clear</button>
    </div>
  );
};

describe('TextbookContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (getTextbooks as jest.Mock).mockResolvedValue(mockTextbooks);
  });

  it('loads textbooks and defaults to first on first visit', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('loading');

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('ids').textContent).toBe('tb-1');
  });

  it('restores saved selection from localStorage', async () => {
    localStorage.setItem('mathtong:selected-textbooks', JSON.stringify(['tb-2']));

    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('ids').textContent).toBe('tb-2');
  });

  it('filters stale IDs and falls back to first', async () => {
    localStorage.setItem('mathtong:selected-textbooks', JSON.stringify(['deleted-id']));

    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('ids').textContent).toBe('tb-1');
  });

  it('persists selection changes to localStorage', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    act(() => {
      screen.getByText('select tb2').click();
    });

    await waitFor(() => {
      const saved = localStorage.getItem('mathtong:selected-textbooks');
      expect(saved).toBe(JSON.stringify(['tb-1', 'tb-2']));
    });
  });

  it('clears selection', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    act(() => {
      screen.getByText('clear').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
```

### Step 6.2: Run tests

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web test --run TextbookContext.test.tsx
```

Expected: All 5 tests PASS.

### Step 6.3: Commit

```bash
git add web/src/contexts/__tests__/TextbookContext.test.tsx
git commit -m "test: add TextbookContext unit tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Final Verification

### Step 7.1: Run full typecheck

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm typecheck
```

Expected: Zero errors across both `web` and `server` packages.

### Step 7.2: Run full lint

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm lint
```

Expected: No errors (or only pre-existing ones).

### Step 7.3: Run web tests

```bash
cd F:/12-PROGRAM/cursor_math_openspec && pnpm --filter web test --run
```

Expected: All tests pass.

### Step 7.4: Manual end-to-end verification checklist

- [ ] Start dev servers (`pnpm dev` + `pnpm dev:server`)
- [ ] Login, import at least 2 textbooks
- [ ] Verify selector appears in nav bar with textbook names
- [ ] Select multiple textbooks, refresh page → selection persists
- [ ] Navigate to `/learning/:textbookId` directly → correct textbook loads, URL ID synced to Context
- [ ] Click "学习" menu → navigates to currently selected textbook
- [ ] Click HomePage "知识学习" card → navigates to currently selected textbook
- [ ] On LearningPage, change selector → URL updates via replace, page reloads with new textbook
- [ ] Delete a selected textbook from DB → refresh → stale ID filtered, falls back to first
- [ ] Clear all selection → navigate to `/learning` → empty state shown

### Step 7.5: Final commit

```bash
git add .
git commit -m "feat: complete global textbook selector implementation

- TextbookContext with multi-select, localStorage persistence, stale-ID validation
- Textbook selector UI in nav bar (Ant Design Select mode=multiple)
- URL-Context bidirectional sync with loop prevention
- LearningPage refactored: 7 textbookId dependencies replaced with activeTextbookId
- AppLayout and HomePage entry points updated to use Context
- Route /learning/:textbookId changed to optional param

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

| Spec Requirement | Implementing Task |
|-----------------|-------------------|
| Context initialization + validation | Task 1 |
| Select/deselect/clear | Task 1 |
| API failure handling | Task 1 (try/catch in init) |
| Selector UI (multi-select, tags, loading) | Task 3 |
| Empty state | Task 3 (disabled Select when no textbooks) |
| LearningPage: URL drives context | Task 5 (useEffect sync) |
| LearningPage: entry without URL param | Task 5 (activeTextbookId derivation) |
| Context drives URL on selector change | Task 5 (useEffect navigate replace) |
| Context-only navigation | Task 1 (no navigate in provider) |
| AppLayout menu entry point | Task 3 |
| HomePage card entry point | Task 4 |
| Stale ID validation | Task 1 |
| URL-Context loop prevention | Task 5 (useRef guard) |

All requirements covered. No gaps.

### Placeholder scan

- No "TBD", "TODO", "implement later" found.
- No vague instructions like "add appropriate error handling".
- All steps have concrete code or commands.

### Type consistency check

- `TextbookContextType` fields match across Context creation, hook, and consumers.
- `activeTextbookId` is consistently `string | undefined` throughout LearningPage.
- `selectedTextbookIds` is always `string[]`.