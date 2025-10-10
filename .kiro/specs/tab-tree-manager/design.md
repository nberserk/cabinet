# Design Document

## Overview

The Tab Tree Manager is a Chrome extension that implements a daemon-client architecture for managing tab information and hierarchical relationships. The daemon serves as a lightweight event router and API proxy that maintains only client subscriptions, while all tab data is retrieved fresh from Chrome Extension APIs. Clients subscribe to specific windows and receive real-time notifications of tab changes, allowing them to build and maintain tab tree structures based on parent-child relationships defined by `openerTabId`.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client A    │    │     Client B    │    │     Client C    │
│   (Window 1)    │    │   (Window 1)    │    │   (Window 2)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Subscribe/API Calls  │                      │
          └──────────┬───────────┘                      │
                     │                                  │
                     ▼                                  ▼
              ┌─────────────────────────────────────────────┐
              │              Daemon                         │
              │  ┌─────────────────┐  ┌─────────────────┐  │
              │  │ Subscription    │  │ Event Router    │  │
              │  │ Manager         │  │                 │  │
              │  └─────────────────┘  └─────────────────┘  │
              └─────────────────┬───────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Chrome Extension      │
                    │        APIs             │
                    │  ┌─────────────────┐    │
                    │  │ tabs.query()    │    │
                    │  │ tabs.onCreated  │    │
                    │  │ tabs.onRemoved  │    │
                    │  │ tabs.onUpdated  │    │
                    │  └─────────────────┘    │
                    └─────────────────────────┘
```

### Component Responsibilities

**Daemon:**
- Maintains client subscription list (client ID + window ID pairs) in memory only
- Listens to Chrome tab events and routes notifications
- Provides API endpoints for client requests
- Retrieves fresh tab data from Chrome APIs on demand
- Does NOT store any tab information or tab state

**Client:**
- Subscribes to daemon for specific windows
- Builds and maintains tab tree structures locally
- Processes tab change notifications from daemon
- Manages parent-child relationships using openerTabId
- Responsible for managing all tab state and tree persistence

## Components and Interfaces

### Daemon Component

#### Subscription Manager
```typescript
interface SubscriptionManager {
  subscribe(clientId: string, windowId: number): Promise<TabInfo[]>
  unsubscribe(clientId: string, windowId?: number): void
  getSubscribedClients(windowId: number): string[]
  cleanupStaleSubscriptions(): void
  
  // Internal in-memory storage of ClientSubscription objects (not persisted)
  // Client is responsible for managing tab state - daemon only manages subscriptions
  private subscriptions: Map<number, ClientSubscription[]> // windowId -> subscriptions
}

// ClientSubscription is used internally by SubscriptionManager to track:
// - Which client (clientId) is subscribed to which window (windowId)  
// - When the subscription was created (subscriptionTime) for cleanup purposes
// Note: Kept in memory only - no persistence required, clients re-subscribe on reconnect
interface ClientSubscription {
  clientId: string
  windowId: number
  subscriptionTime: number // For stale connection cleanup, not persistence
}
```

#### Event Router
```typescript
interface EventRouter {
  initialize(): void
  cleanup(): void
  broadcastTabEvent(event: TabEvent): void
}

interface TabEvent {
  type: 'created' | 'removed' | 'updated' | 'moved'
  windowId: number
  tabInfo: TabInfo
  timestamp: number
}
```

#### Chrome API Wrapper
```typescript
interface ChromeAPIWrapper {
  getTabsForWindow(windowId: number): Promise<TabInfo[]>
  getTabById(tabId: number): Promise<TabInfo>
  registerEventListeners(): void
  unregisterEventListeners(): void
}
```

### Client Component

#### Tab Tree Builder
```typescript
interface TabTreeBuilder {
  buildTree(tabs: TabInfo[]): TabNode[]
  updateTree(event: TabEvent): void
  getTreeForWindow(windowId: number): TabNode[]
  
  // Client is responsible for managing all tab state and persistence
  persistTabState(windowId: number): void
  loadTabState(windowId: number): TabNode[]
  clearTabState(windowId?: number): void
}

interface TabNode {
  tab: TabInfo
  children: TabNode[]
  parent?: TabNode
}
```

#### Daemon Client
```typescript
interface DaemonClient {
  subscribe(windowId: number): Promise<TabInfo[]>
  unsubscribe(windowId?: number): void
  onTabEvent(callback: (event: TabEvent) => void): void
  
  // Client manages its own connection state and reconnection logic
  reconnect(): Promise<void>
  isConnected(): boolean
}
```

## Data Models

### Core Data Structures

```typescript
interface TabInfo {
  id: number
  windowId: number
  index: number
  title: string
  url: string
  openerTabId?: number
  status: 'loading' | 'complete'
  active: boolean
}

interface WindowInfo {
  id: number
  focused: boolean
  type: 'normal' | 'popup' | 'panel'
}

// Usage Example: When clients subscribe and events occur
/*
Example scenario:
1. Client "client-A" subscribes to window 123
   -> Creates ClientSubscription { clientId: "client-A", windowId: 123, subscriptionTime: Date.now() }
   
2. Client "client-B" also subscribes to window 123  
   -> Creates ClientSubscription { clientId: "client-B", windowId: 123, subscriptionTime: Date.now() }
   
3. Tab event occurs in window 123
   -> SubscriptionManager looks up all ClientSubscription objects for windowId 123
   -> Finds ["client-A", "client-B"] and sends event to both clients
   
4. Client "client-A" disconnects
   -> SubscriptionManager removes ClientSubscription for "client-A" from window 123
   
5. Daemon restarts
   -> All subscriptions are lost (in-memory only)
   -> Clients must re-subscribe when they reconnect
*/
```

### API Message Formats

```typescript
// Subscription Request
interface SubscribeRequest {
  type: 'subscribe'
  clientId: string
  windowId: number
}

// Subscription Response
interface SubscribeResponse {
  type: 'subscribe_response'
  success: boolean
  tabs?: TabInfo[]
  error?: string
}

// Tab Event Notification
interface TabEventNotification {
  type: 'tab_event'
  event: TabEvent
  windowId: number
}

// Error Response
interface ErrorResponse {
  type: 'error'
  code: string
  message: string
  details?: any
}
```

## Error Handling

### Error Categories

1. **Chrome API Errors**
   - Tab/Window not found
   - Permission denied
   - API rate limiting
   - Extension context invalidated

2. **Client Communication Errors**
   - Client disconnection (client handles reconnection)
   - Message delivery failure
   - Invalid request format
   - Subscription conflicts

3. **System Errors**
   - Memory limitations
   - Concurrent access issues
   - Resource cleanup failures

### Error Handling Strategy

```typescript
interface ErrorHandler {
  handleChromeAPIError(error: chrome.runtime.LastError): void
  handleClientError(clientId: string, error: Error): void
  retryOperation<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>
}

// Error Recovery Patterns
const errorRecovery = {
  chromeAPIFailure: {
    strategy: 'retry_with_backoff',
    maxRetries: 3,
    backoffMs: [100, 500, 1000]
  },
  clientDisconnection: {
    strategy: 'cleanup_subscription_only', // Client handles reconnection and state recovery
    timeoutMs: 5000
  },
  invalidWindow: {
    strategy: 'notify_and_cleanup',
    notifyClients: true
  }
}
```

## Testing Strategy

### Unit Testing

1. **Daemon Components**
   - Subscription Manager: Add/remove subscriptions, client lookup
   - Event Router: Event broadcasting, listener management
   - Chrome API Wrapper: API call mocking, error handling

2. **Client Components**
   - Tab Tree Builder: Tree construction, parent-child relationships
   - Daemon Client: Subscription management, event handling

### Integration Testing

1. **Daemon-Client Communication**
   - Subscription flow end-to-end
   - Event notification delivery
   - Error propagation and handling

2. **Chrome API Integration**
   - Tab event listening and processing
   - Fresh data retrieval accuracy
   - Permission and context handling

### Test Data Scenarios

```typescript
// Test Scenarios
const testScenarios = {
  basicSubscription: {
    description: 'Client subscribes to window with existing tabs',
    setup: 'Create window with 3 tabs, 1 with opener relationship',
    expected: 'Client receives all tab info with correct openerTabId'
  },
  
  realTimeUpdates: {
    description: 'Tab changes trigger client notifications',
    setup: 'Subscribe client, create/update/remove tabs',
    expected: 'Client receives events within 100ms'
  },
  
  parentChildRelationships: {
    description: 'Tab tree reflects opener relationships',
    setup: 'Create tabs with various opener relationships',
    expected: 'Tree structure matches opener hierarchy'
  },
  
  multiClientWindow: {
    description: 'Multiple clients subscribe to same window',
    setup: '3 clients subscribe to window 1',
    expected: 'All clients receive same events independently'
  },
  
  windowClosure: {
    description: 'Window closure cleanup',
    setup: 'Subscribe to window, close window',
    expected: 'Subscriptions cleaned up, clients notified'
  }
}
```

### Performance Testing

1. **Subscription Scalability**
   - Test with 100+ concurrent client subscriptions
   - Memory usage monitoring during high subscription load
   - Event delivery latency under load

2. **Chrome API Performance**
   - Fresh data retrieval response times
   - Event processing throughput
   - Resource cleanup efficiency

### Mock Implementations

```typescript
// Chrome API Mock for Testing
class MockChromeAPI implements ChromeAPIWrapper {
  private mockTabs: Map<number, TabInfo> = new Map()
  private mockWindows: Map<number, WindowInfo> = new Map()
  
  async getTabsForWindow(windowId: number): Promise<TabInfo[]> {
    return Array.from(this.mockTabs.values())
      .filter(tab => tab.windowId === windowId)
  }
  
  simulateTabCreation(tab: TabInfo): void {
    this.mockTabs.set(tab.id, tab)
    this.triggerEvent('created', tab)
  }
  
  simulateTabRemoval(tabId: number): void {
    const tab = this.mockTabs.get(tabId)
    if (tab) {
      this.mockTabs.delete(tabId)
      this.triggerEvent('removed', tab)
    }
  }
}
```