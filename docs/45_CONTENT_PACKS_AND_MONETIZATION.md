# Content Packs and Monetization

## Purpose

This document defines the content pack structure, monetization tiers, and feature gating.

Monetization is not in initial scope. This document describes the intended structure for future implementation.

## Monetization Principles

The game avoids predatory mechanics.

| Avoid                 | Acceptable        |
| --------------------- | ----------------- |
| Pay-to-win            | Premium version   |
| Energy timers         | Cosmetic packs    |
| Forced ads            | Content packs     |
| Manipulative streaks  | Supporter edition |
| Slow progress to sell | DLC expansions    |

## Content Pack Structure

A content pack is a `.zip` file or directory with the following layout:

```txt
pack_id/
  manifest.json
  assets/
    models/
    textures/
    icons/
  data/
    buildings.json
    scenarios.json
```

### Manifest

```txt
{
  "id": "industrial_renaissance",
  "name": "Industrial Renaissance",
  "version": "1.0.0",
  "type": "cosmetic" | "content",
  "buildings": ["factory_v2", "warehouse_v2"],
  "models": ["factory_v2.glb", "warehouse_v2.glb"],
  "textures": ["factory_diffuse.png"],
  "price": 4.99
}
```

## Pack Types

### Cosmetic Packs

- Reskin existing building models with alternative visuals.
- No gameplay effect.
- Example: "Modern Buildings" pack replaces small_house, small_shop, small_factory with modern-style models.

### Content Packs

- New building definitions with gameplay effects.
- New scenarios.
- New balance presets.
- Example: "Industrial Renaissance" adds 5 new factory variants with new stats.

## Monetization Tiers

### Free Version

| Feature             | Included |
| ------------------- | :------: |
| Phase 1 gameplay    |   Yes    |
| Phase 2 gameplay    |   Yes    |
| All scenarios       |   Yes    |
| Unlimited play time |   Yes    |
| Ads                 |    No    |
| Save/load           |   Yes    |

### Premium Version

One-time purchase. Includes all content packs.

| Feature            | Included |
| ------------------ | :------: |
| Everything in Free |   Yes    |
| All content packs  |   Yes    |
| Scenario editor    |   Yes    |
| Priority support   |    No    |

### Supporter Edition

Premium + exclusive cosmetic pack + early access.

| Feature                    | Included |
| -------------------------- | :------: |
| Everything in Premium      |   Yes    |
| Exclusive cosmetic pack    |   Yes    |
| Early access to new packs  |   Yes    |
| Supporter badge in credits |   Yes    |

## Store UI

The store is a panel accessible from the main menu.

### Pack Browser

| Section   | Content                |
| --------- | ---------------------- |
| Featured  | Highlighted packs      |
| Cosmetic  | All cosmetic packs     |
| Content   | All content packs      |
| Supporter | Supporter edition info |

### Pack Preview

Selecting a pack shows:

- name, description, version, author;
- screenshots or model previews;
- price;
- "Buy" button (placeholder in development).

### Purchase Flow

```txt
select pack -> preview -> buy (placeholder) -> confirmation -> content unlocked
```

During development, the buy button shows "Coming Soon" and logs the intent.

## Feature Gating

A runtime `isPremium` flag controls access to paid features.

```txt
isPremium: false (free version)
isPremium: true  (premium or supporter)
```

Premium features:

- are hidden from UI if `isPremium` is false;
- show a lock icon with "Available in Premium" tooltip;
- do not block core gameplay if missing.

## Runtime Check

```txt
if (!isPremium && featureRequiresPremium) {
  showLockIcon()
  return
}
```

No paid feature is ever required to complete the base scenarios.

## Refund Policy

Not applicable until real store implementation. Placeholder text: "Refund requests are handled according to the platform's refund policy."

## Tests

- Content pack with valid manifest loads its building definitions.
- Content pack with invalid manifest is rejected with an error message.
- Cosmetic pack does not override building stats, only visuals.
- Free version has all Phase 1 and Phase 2 features unlocked.
- Premium-exclusive building is hidden from non-premium players.
- Premium-exclusive building shows lock icon when `isPremium` is false.
- Premium-exclusive building is accessible when `isPremium` is true.
- Content pack buildings have correct cost, upkeep, and jobs from pack data.
- Store UI shows "Coming Soon" for purchase button in development mode.
- Pack with missing `id` in manifest is rejected.
- Unloading a content pack restores original building definitions.
- Feature gating does not affect game save/load functionality.
- Supporter edition includes premium content plus exclusive pack.
