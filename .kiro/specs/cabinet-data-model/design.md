# Cabinet Data Model Design Document

## Overview

The Cabinet data model represents a saved collection of browser tabs that can be stored, retrieved, and restored. This design document defines the Cabinet interface structure for managing tab collections with organizational metadata.

## Architecture

### Data Model Structure

The Cabinet interface serves as the core data structure for representing saved tab collections. It combines tab information with organizational metadata in a clean, flat structure for optimal usability.

## Components and Interfaces

### Cabinet Interface

The primary data structure for representing a saved tab collection:

```typescript
export interface Cabinet {
  id: string;                // Unique identifier for the cabinet
  name: string;              // User-defined or auto-generated name
  createdAt: number;         // Timestamp when cabinet was created
  updatedAt: number;         // Timestamp when cabinet was last modified
  tabs: Tab[];               // All tabs in their original order
  activeTabId: number;       // ID of the tab that was active when saved
  description?: string;      // Optional user description
  tags?: string[];           // Optional tags for organization
}
```

### Key Design Decisions

1. **Flat Structure**: All properties are at the top level for direct access and manipulation.

2. **Optional Metadata**: Both `description` and `tags` are optional, allowing for minimal cabinet creation while supporting rich organization when needed.

3. **Direct Property Access**: Simple property access (`cabinet.description`) improves developer experience and reduces complexity.

### Benefits of This Structure

1. **Simplified API**: Direct property access reduces code complexity
2. **Better TypeScript Support**: Flat structure provides better autocomplete and type checking
3. **Easier Serialization**: Simple object structure simplifies JSON operations
4. **Reduced Boilerplate**: No need to initialize nested objects
5. **Consistent with Modern Patterns**: Aligns with flat data structure best practices
6. **Direct Array Storage**: Using `Cabinet[]` directly eliminates wrapper objects and reduces complexity
7. **Simplified Operations**: Array operations are more intuitive than nested collection management

## Data Models

### Cabinet Storage

The storage now uses a simple `Cabinet[]` array directly, eliminating the need for a wrapper collection interface. This simplifies the data structure and reduces complexity:

```typescript
// Storage now uses Cabinet[] directly instead of CabinetCollection
const storage = createStorage<Cabinet[]>('cabinet-collection-key', [], options);
```

### Usage Examples

**Creating a Cabinet:**
```typescript
const cabinet: Cabinet = {
  id: 'cabinet-123',
  name: 'Research Session',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tabs: tabsArray,
  activeTabId: 42,
  description: 'Machine learning research',
  tags: ['research', 'ml', 'papers']
};
```

**Updating Cabinet Metadata:**
```typescript
// Direct property updates
cabinet.description = 'Updated description';
cabinet.tags = [...cabinet.tags, 'new-tag'];
cabinet.updatedAt = Date.now();
```

**Searching by Metadata:**
```typescript
// Simplified property access in search operations
const matchesDescription = cabinet.description?.toLowerCase().includes(query);
const matchesTags = cabinet.tags?.some(tag => tag.toLowerCase().includes(query));
```



## Error Handling

### Validation Rules

1. **Required Fields**: `id`, `name`, `createdAt`, `updatedAt`, `tabs`, `activeTabId` must be present
2. **Type Validation**: Ensure proper types for all fields
3. **Array Validation**: `tags` must be an array of strings if present
4. **ID Uniqueness**: Cabinet IDs must be unique within a collection

### Error Scenarios

1. **Missing Required Fields**: Throw validation error with specific field information
2. **Invalid Types**: Type coercion or validation errors
3. **Duplicate IDs**: Handle ID conflicts during creation/import
4. **Malformed Data**: Graceful handling of corrupted cabinet data

## Testing Strategy

### Unit Testing

1. **Interface Validation**: Test that Cabinet objects conform to the interface
2. **Property Access**: Verify direct property access works correctly
3. **Optional Properties**: Test behavior with and without optional fields
4. **Migration Logic**: Test conversion from old to new structure

### Integration Testing

1. **Storage Operations**: Test saving and retrieving Cabinet objects
2. **Search Functionality**: Test searching across flattened properties
3. **Collection Management**: Test Cabinet operations within CabinetCollection

### Test Cases

```typescript
describe('Cabinet Interface', () => {
  it('should create cabinet with required fields', () => {
    const cabinet: Cabinet = {
      id: 'test-id',
      name: 'Test Cabinet',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tabs: [],
      activeTabId: 0
    };
    expect(cabinet).toBeDefined();
  });

  it('should support optional description and tags', () => {
    const cabinet: Cabinet = {
      // ... required fields
      description: 'Test description',
      tags: ['tag1', 'tag2']
    };
    expect(cabinet.description).toBe('Test description');
    expect(cabinet.tags).toEqual(['tag1', 'tag2']);
  });

  it('should work without optional fields', () => {
    const cabinet: Cabinet = {
      // ... only required fields
    };
    expect(cabinet.description).toBeUndefined();
    expect(cabinet.tags).toBeUndefined();
  });
});
```

## Performance Considerations

### Memory Usage

1. **Flat Structure**: Simple object structure minimizes memory overhead
2. **Optional Properties**: Properties not set don't consume memory
3. **Array Optimization**: Tags array only allocated when needed

### Access Performance

1. **Direct Property Access**: O(1) access time for all properties
2. **Simple Object Traversal**: No nested object lookup overhead
3. **Serialization Speed**: Flat structure serializes efficiently

## Future Considerations

### Extensibility

The flat structure allows for easy addition of new top-level properties:

```typescript
// Future extensions
interface Cabinet {
  // ... existing properties
  color?: string;           // Cabinet color theme
  icon?: string;            // Cabinet icon identifier
  lastAccessed?: number;    // Last access timestamp
  favorite?: boolean;       // Favorite flag
}
```

### Indexing and Search

The flat structure enables efficient indexing strategies:

1. **Property Indexing**: Direct indexing on description and tags
2. **Full-Text Search**: Easier implementation across flat properties
3. **Filtering**: Simplified filter operations on top-level properties