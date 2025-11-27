# 🎨 Jira-Style Dark Mode Textbox Guide

## ✅ CSS Classes Added to `globals.css`

Two new utility classes have been added:
- `.jira-input` - For standard input fields
- `.jira-textarea` - For textarea fields

---

## 📦 Usage Examples

### 1. Plain CSS (Already in globals.css)

```css
.jira-input {
  background-color: #1D1F24;
  border: 1px solid #2C2F34;
  color: #EBECF0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.jira-input::placeholder {
  color: #8A9099;
}

.jira-input:hover {
  border-color: #3A3F44;
}

.jira-input:focus {
  border-color: #579DFF;
  box-shadow: 0 0 0 3px rgba(87, 157, 255, 0.25);
}
```

### 2. Tailwind CSS Version

```tsx
<input
  type="text"
  className="bg-[#1D1F24] border border-[#2C2F34] text-[#EBECF0] rounded-md px-3 py-2 text-sm 
             transition-all duration-200 outline-none
             placeholder:text-[#8A9099]
             hover:border-[#3A3F44]
             focus:border-[#579DFF] focus:ring-4 focus:ring-[#579DFF]/25"
  placeholder="Enter text..."
/>
```

### 3. Using the CSS Class

```tsx
<input
  type="text"
  className="jira-input w-full"
  placeholder="Enter text..."
/>

<textarea
  className="jira-textarea w-full"
  placeholder="Enter description..."
/>
```

### 4. React/Next.js Component Example

```tsx
// components/ui/jira-input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface JiraInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const JiraInput = React.forwardRef<HTMLInputElement, JiraInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("jira-input w-full", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
JiraInput.displayName = "JiraInput";

export { JiraInput };
```

### 5. JiraTextarea Component

```tsx
// components/ui/jira-textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface JiraTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const JiraTextarea = React.forwardRef<HTMLTextAreaElement, JiraTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn("jira-textarea w-full", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
JiraTextarea.displayName = "JiraTextarea";

export { JiraTextarea };
```

### 6. Usage in Forms

```tsx
import { JiraInput } from "@/components/ui/jira-input";
import { JiraTextarea } from "@/components/ui/jira-textarea";

export function MyForm() {
  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Project Name
        </label>
        <JiraInput
          type="text"
          placeholder="Enter project name..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <JiraTextarea
          placeholder="Enter project description..."
          rows={4}
        />
      </div>
    </form>
  );
}
```

---

## 🎨 Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| Background | `#1D1F24` | Input background |
| Border | `#2C2F34` | Default border |
| Border Hover | `#3A3F44` | Hover state |
| Border Focus | `#579DFF` | Focus state |
| Focus Glow | `rgba(87,157,255,0.25)` | Focus ring |
| Text | `#EBECF0` | Input text |
| Placeholder | `#8A9099` | Placeholder text |

---

## 📝 Integration with Existing Forms

To convert existing inputs to Jira style, simply add the `jira-input` or `jira-textarea` class:

**Before:**
```tsx
<input className="w-full border rounded px-3 py-2" />
```

**After:**
```tsx
<input className="jira-input w-full" />
```

---

## 🔧 Customization

To modify the styles globally, edit the `.jira-input` and `.jira-textarea` classes in `src/app/globals.css`.

For one-off customizations, use Tailwind utilities:
```tsx
<input className="jira-input w-full h-12 text-lg" />
```
