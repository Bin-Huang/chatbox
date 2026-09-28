// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import type { SessionFolder } from '@shared/types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { createFolderMock, hideMock, modalState, renameFolderMock, resolveMock, toastAddMock } = vi.hoisted(() => ({
  createFolderMock: vi.fn(),
  hideMock: vi.fn(),
  // Tests drive visibility to simulate NiceModal's hide() -> show() reuse cycle.
  modalState: { visible: true },
  renameFolderMock: vi.fn(),
  resolveMock: vi.fn(),
  toastAddMock: vi.fn(),
}))

// Same reuse path as FolderSessionPicker: NiceModal keeps the modal mounted
// across show() calls and only swaps the args/props.
vi.mock('@ebay/nice-modal-react', () => ({
  default: {
    create: <P,>(Component: ComponentType<P>) => Component,
  },
  useModal: () => ({ hide: hideMock, remove: vi.fn(), resolve: resolveMock, visible: modalState.visible }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/common/AdaptiveModal', async () => {
  const React = await import('react')
  const Shell = ({ children, title }: { children: React.ReactNode; title: string }) =>
    React.createElement('div', null, React.createElement('h2', null, title), children)
  Shell.Actions = ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
  Shell.CloseButton = ({ onClick }: { onClick?: () => void }) =>
    React.createElement('button', { onClick, type: 'button' }, 'Cancel')
  return { AdaptiveModal: Shell }
})

vi.mock('@/hooks/useScreenChange', () => ({ useIsSmallScreen: () => false }))
vi.mock('@/stores/sessionFolders', () => ({ createFolder: createFolderMock, renameFolder: renameFolderMock }))
vi.mock('@/stores/toastActions', () => ({ add: toastAddMock }))

import FolderSettings from './FolderSettings'

const SettingsModal = FolderSettings as unknown as ComponentType<{ mode: 'create' | 'rename'; folder?: SessionFolder }>

const folderA: SessionFolder = { id: 'folder-a', name: 'Folder A', sortOrder: 2000, createdAt: 1 }
const folderB: SessionFolder = { id: 'folder-b', name: 'Folder B', sortOrder: 1000, createdAt: 2 }

function renderSettings(props: { mode: 'create' | 'rename'; folder?: SessionFolder }) {
  return render(
    <MantineProvider>
      <SettingsModal {...props} />
    </MantineProvider>
  )
}

function treeSettings(props: { mode: 'create' | 'rename'; folder?: SessionFolder }) {
  return (
    <MantineProvider>
      <SettingsModal {...props} />
    </MantineProvider>
  )
}

function nameInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Folder Name') as HTMLInputElement
}

describe('FolderSettings state reset across NiceModal reuse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })
    modalState.visible = true
  })

  test('rename prefills the target folder name', () => {
    renderSettings({ mode: 'rename', folder: folderA })
    expect(nameInput().value).toBe('Folder A')
  })

  test('reopening for a different folder replaces the input (NiceModal keeps the component mounted)', () => {
    const { rerender } = renderSettings({ mode: 'rename', folder: folderA })
    fireEvent.change(nameInput(), { target: { value: 'Typed in A' } })

    rerender(
      <MantineProvider>
        <SettingsModal mode="rename" folder={folderB} />
      </MantineProvider>
    )

    // Regression guard: without the useEffect sync the box keeps "Typed in A"
    // and saving would rename folder B to folder A's draft.
    expect(nameInput().value).toBe('Folder B')
  })

  test('switching to create mode clears a previous rename draft', () => {
    const { rerender } = renderSettings({ mode: 'rename', folder: folderA })
    fireEvent.change(nameInput(), { target: { value: 'Typed in A' } })

    rerender(
      <MantineProvider>
        <SettingsModal mode="create" />
      </MantineProvider>
    )

    expect(nameInput().value).toBe('')
  })

  test('reopening for the SAME folder discards the rename draft', () => {
    const { rerender } = renderSettings({ mode: 'rename', folder: folderA })
    fireEvent.change(nameInput(), { target: { value: 'Typed draft' } })

    // hide() keeps the modal mounted; show() for the same folder changes no
    // prop identity — only the visibility edge can reset the draft.
    modalState.visible = false
    rerender(treeSettings({ mode: 'rename', folder: folderA }))
    modalState.visible = true
    rerender(treeSettings({ mode: 'rename', folder: folderA }))

    expect(nameInput().value).toBe('Folder A')
  })

  test('reopening create mode discards the previous draft', () => {
    const { rerender } = renderSettings({ mode: 'create' })
    fireEvent.change(nameInput(), { target: { value: 'Typed draft' } })

    // create -> create: props.folder is undefined both times, so the folder
    // prop never changes identity between the two opens.
    modalState.visible = false
    rerender(treeSettings({ mode: 'create' }))
    modalState.visible = true
    rerender(treeSettings({ mode: 'create' }))

    expect(nameInput().value).toBe('')
  })

  test('a failed save shows a toast and keeps the modal open', async () => {
    renameFolderMock.mockRejectedValueOnce(new Error('storage down'))
    renderSettings({ mode: 'rename', folder: folderA })
    fireEvent.change(nameInput(), { target: { value: '  Renamed  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(toastAddMock).toHaveBeenCalledTimes(1)
    })
    expect(hideMock).not.toHaveBeenCalled()
  })

  test('saving a rename writes the trimmed name to the target folder', async () => {
    renameFolderMock.mockResolvedValue(undefined)
    renderSettings({ mode: 'rename', folder: folderA })
    fireEvent.change(nameInput(), { target: { value: '  Renamed  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => {
      expect(renameFolderMock).toHaveBeenCalledWith('folder-a', 'Renamed')
    })
    expect(hideMock).toHaveBeenCalled()
  })
})
