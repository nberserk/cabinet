# Requirements Document

## Introduction

This feature will implement a Chrome extension tab tree manager with a daemon-client architecture. The daemon component interacts directly with Chrome APIs to monitor tab changes and maintains only a list of subscribed clients, while client components call daemon APIs to receive tab information and build tab trees. The daemon does not store tab information but retrieves it fresh from Chrome APIs on each request. The system maintains parent-child relationships between tabs based on `openerTabId` and operates on a per-window subscription model. This specification excludes any UI components and focuses on the API communication layer.

## Requirements

### Requirement 1

**User Story:** As a client application, I want to subscribe to a daemon for Chrome tab information on a per-window basis, so that I can receive the current state of tabs and build a tab tree structure for specific windows.

#### Acceptance Criteria

1. WHEN a client requests subscription THEN the client SHALL specify the Chrome window ID
2. WHEN a client subscribes to the daemon THEN the daemon SHALL retrieve fresh Chrome tab information for the requested window and return it
3. WHEN returning tab information THEN the daemon SHALL include tab ID, title, URL, window ID, index, openerTabId, and tab status (active, loading, complete)
4. WHEN subscribing to a window THEN the daemon SHALL add the client to its subscription list for that specific window only
5. WHEN multiple clients subscribe to the same window THEN the daemon SHALL maintain separate entries in its subscription list for each client
6. WHEN a client subscribes to multiple windows THEN the daemon SHALL handle each subscription independently in its subscription list
7. WHEN the daemon maintains subscriptions THEN it SHALL NOT store any tab information, only client subscription details
8. IF the requested window does not exist THEN the daemon SHALL return an error response
9. IF a window is closed THEN the daemon SHALL notify all subscribed clients and remove those subscriptions from its list

### Requirement 2

**User Story:** As a subscribed client, I want to receive real-time notifications of tab changes, so that I can keep my tab tree synchronized with the current Chrome state.

#### Acceptance Criteria

1. WHEN a tab is created in a subscribed window THEN the daemon SHALL send a tab creation event to all subscribed clients
2. WHEN a tab is removed from a subscribed window THEN the daemon SHALL send a tab removal event to all subscribed clients
3. WHEN a tab is updated in a subscribed window THEN the daemon SHALL send a tab update event to all subscribed clients
4. WHEN sending change notifications THEN the daemon SHALL include the complete tab information and change type
5. WHEN sending notifications THEN the daemon SHALL deliver them within 100ms of the Chrome event

### Requirement 3

**User Story:** As a client application, I want to understand parent-child relationships between tabs, so that I can build an accurate hierarchical tab tree structure.

#### Acceptance Criteria

1. WHEN a tab has an opener THEN the daemon SHALL include the openerTabId in the tab information
2. WHEN multiple tabs share the same openerTabId THEN the daemon SHALL identify them as sibling tabs with the same parent
3. WHEN a tab has no opener THEN the daemon SHALL set openerTabId to null or undefined
4. WHEN providing tab information THEN the daemon SHALL ensure openerTabId references are consistent and valid
5. IF an opener tab is closed THEN the daemon SHALL maintain the openerTabId reference for historical tracking

### Requirement 4

**User Story:** As a daemon component, I want to interact with Chrome Extension APIs, so that I can monitor tab events and retrieve tab information accurately without storing tab data.

#### Acceptance Criteria

1. WHEN the daemon starts THEN it SHALL register listeners for Chrome tab events (onCreated, onRemoved, onUpdated, onMoved)
2. WHEN Chrome tab events occur THEN the daemon SHALL process them and notify subscribed clients without storing tab information
3. WHEN retrieving tab information THEN the daemon SHALL use Chrome tabs API to get fresh current tab data
4. WHEN the daemon needs tab information THEN it SHALL always query Chrome APIs rather than using cached data
5. WHEN Chrome API calls fail THEN the daemon SHALL handle errors gracefully and retry operations
6. WHEN the daemon stops THEN it SHALL properly clean up Chrome API listeners

### Requirement 5

**User Story:** As a daemon component, I want to manage client subscriptions efficiently, so that I can deliver tab change notifications to the right clients without storing tab data.

#### Acceptance Criteria

1. WHEN a client subscribes THEN the daemon SHALL store only the client identifier and window ID in its subscription list
2. WHEN a client disconnects THEN the daemon SHALL remove the subscription from its list and clean up resources
3. WHEN broadcasting tab changes THEN the daemon SHALL only send notifications to clients subscribed to the affected window
4. WHEN managing subscriptions THEN the daemon SHALL handle concurrent subscription requests safely
5. WHEN maintaining subscriptions THEN the daemon SHALL store only client subscription information in memory, not tab data. it's client's responsibility to manage tab state


### Requirement 6

**User Story:** As a system architect, I want clear API contracts between daemon and client, so that the components can communicate reliably and be developed independently.

#### Acceptance Criteria

1. WHEN a client subscribes THEN the daemon SHALL respond with a standardized subscription confirmation message
2. WHEN sending tab information THEN the daemon SHALL use a consistent data format for all tab properties
3. WHEN sending change notifications THEN the daemon SHALL include event type, window ID, and affected tab data
4. WHEN errors occur THEN the daemon SHALL send standardized error messages with error codes and descriptions
5. WHEN the API evolves THEN the daemon SHALL maintain backward compatibility or provide clear versioning