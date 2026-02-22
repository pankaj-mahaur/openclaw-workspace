# Ayurnod Responsive Website Conversion Plan

## Project Overview
Convert existing Expo React Native app to responsive web-first application while maintaining mobile app functionality.

## Current State Analysis
- **App Type**: Expo React Native with Expo Router
- **Current Layout**: Mobile-first with ScrollView, StyleSheet, fixed dimensions
- **Navigation**: Expo Router with file-based routing
- **State Management**: Zustand
- **Backend**: FastAPI with mock AI explanations
- **Database**: Supabase (configured but not fully implemented)

## Conversion Strategy

### Phase 1: Foundation Setup
1. **Install Web Dependencies**
   - Add `react-native-web`, `react-dom`, `@expo/web` packages
   - Configure webpack for web builds
   - Set up responsive viewport meta tags

2. **Theme System Creation**
   - Create design tokens (colors, typography, spacing)
   - Implement responsive breakpoints
   - Set up CSS-in-JS theme provider

### Phase 2: Layout Architecture
1. **Responsive Grid System**
   - Replace ScrollView with CSS Grid/Flexbox
   - Implement responsive breakpoints (mobile, tablet, desktop)
   - Create reusable layout components

2. **Navigation Enhancement**
   - Update Expo Router for web routing
   - Add responsive navigation patterns
   - Implement mobile menu for smaller screens

### Phase 3: Component Refactoring
1. **Responsive Components**
   - Convert fixed dimensions to responsive units
   - Implement responsive typography
   - Add touch-friendly mobile interactions

2. **Form Optimization**
   - Responsive form layouts
   - Input validation and error states
   - Loading states for API calls

### Phase 4: Styling & Theming
1. **Design System**
   - Create consistent color palette
   - Implement typography hierarchy
   - Add spacing and sizing system

2. **Responsive Styling**
   - Media queries for different screen sizes
   - Dark/light theme support
   - Accessibility improvements

## Technical Implementation Plan

### 1. Package Updates
```bash
npm install react-native-web react-dom @expo/web
npm install --save-dev @expo/webpack-config
```

### 2. Configuration Files
- `app.json`: Add web-specific configurations
- `webpack.config.js`: Custom web build config
- `metro.config.js`: Shared configuration

### 3. Theme System
```typescript
// lib/theme.ts
export const theme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#34a853',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#202124',
    muted: '#5f6368',
  },
  breakpoints: {
    mobile: '375px',
    tablet: '768px',
    desktop: '1024px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};
```

### 4. Responsive Components
```typescript
// components/ResponsiveView.tsx
import { View, StyleSheet } from 'react-native';

export default function ResponsiveView({ children, style }) {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    maxWidth: '1200px',
    marginHorizontal: 'auto',
    width: '100%',
  },
});
```

### 5. Navigation Updates
- Update `app/_layout.tsx` for responsive navigation
- Add mobile menu component
- Implement responsive header

### 6. Form Components
- Create responsive form inputs
- Add validation and error states
- Implement loading indicators

## Branch Strategy
1. **Main Branch**: Keep stable mobile app
2. **responsive-website**: Development branch for web conversion
3. **Future Branches**: Feature-specific branches as needed

## Testing Strategy
1. **Device Testing**: Test on mobile, tablet, desktop
2. **Browser Testing**: Chrome, Firefox, Safari, Edge
3. **Accessibility Testing**: Screen readers, keyboard navigation
4. **Performance Testing**: Bundle size, load times

## Timeline & Milestones
- **Week 1**: Foundation setup and theme system
- **Week 2**: Layout architecture and navigation
- **Week 3**: Component refactoring and styling
- **Week 4**: Testing, optimization, and deployment

## Success Metrics
- Responsive design works on all screen sizes
- Mobile app functionality preserved
- Performance comparable to native app
- Accessibility standards met
- User experience consistent across devices

## Risk Mitigation
- Keep mobile app functional during conversion
- Test frequently to catch breaking changes
- Maintain version control for rollback capability
- Document all changes for future maintenance

## Next Steps
1. Install web dependencies
2. Create theme system
3. Set up responsive layout foundation
4. Begin component refactoring
5. Test and iterate

---

*Last updated: 2026-02-22*
*Branch: responsive-website*