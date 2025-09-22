# UI Enhancement Rules

## Always Apply These Principles

### Performance Optimization
- Always prefer incremental DOM updates over full re-renders
- Use Tailwind CSS classes instead of inline styles when possible
- Implement targeted element updates for single changes

### Code Consistency
- When updating sidepanel.js, also update sidepanel-test.html with the same changes
- When adding new functionality, update both requirements.md and design.md
- Use consistent naming conventions across all files

### UI/UX Standards
- Use Tailwind padding classes (pl-0, pl-4, pl-8, etc.) for hierarchy indentation
- Maintain accessibility attributes (aria-*, role, tabindex)
- Follow the established message passing patterns for Chrome extension communication

### Documentation Updates
- When implementing new features, always update the corresponding spec documents
- Add new acceptance criteria for performance improvements
- Update design document with new methods and data flow changes

## File Update Patterns
- sidepanel.js changes → also update sidepanel-test.html
- New functionality → update requirements.md and design.md
- Performance improvements → add to acceptance criteria
- New message types → document in Event Handler section