#![cfg(test)]

//! Unit tests for the `shadow` metadata module (issue #57).
//!
//! `shadow.rs` implements metadata field type handling and schema version
//! comparison but shipped without any tests. The version comparison
//! (`is_greater_than`) and the integer-to-enum mapping (`from_u32`) are
//! exactly the kind of off-by-one-prone logic the issue calls out: a single
//! mistake in the minor/patch ordering would silently accept a downgrade,
//! and a wrong discriminant mapping would corrupt metadata validation. Every
//! ordering branch and every valid discriminant is exercised here.

use super::shadow::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};

#[test]
fn test_is_greater_than_all_ordering_cases() {
    let v100 = MetadataSchemaVersion {
        major: 1,
        minor: 0,
        patch: 0,
    };

    // Identical versions are never "greater".
    assert!(!v100.is_greater_than(&v100.clone()));

    // Higher major wins regardless of minor/patch.
    assert!(
        MetadataSchemaVersion {
            major: 2,
            minor: 0,
            patch: 0,
        }
        .is_greater_than(&v100)
    );
    assert!(
        MetadataSchemaVersion {
            major: 2,
            minor: 0,
            patch: 0,
        }
        .is_greater_than(&MetadataSchemaVersion {
            major: 1,
            minor: 9,
            patch: 9,
        })
    );

    // Equal major: higher minor wins regardless of patch.
    assert!(
        MetadataSchemaVersion {
            major: 1,
            minor: 1,
            patch: 0,
        }
        .is_greater_than(&v100)
    );
    assert!(
        MetadataSchemaVersion {
            major: 1,
            minor: 1,
            patch: 0,
        }
        .is_greater_than(&MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 9,
        })
    );

    // Equal major and minor: higher patch wins.
    assert!(
        MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 1,
        }
        .is_greater_than(&v100)
    );

    // The "lower" direction is never greater.
    assert!(
        !MetadataSchemaVersion {
            major: 0,
            minor: 9,
            patch: 9,
        }
        .is_greater_than(&v100)
    );
    assert!(
        !MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 0,
        }
        .is_greater_than(&MetadataSchemaVersion {
            major: 1,
            minor: 1,
            patch: 0,
        })
    );
    assert!(
        !MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 0,
        }
        .is_greater_than(&MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 1,
        })
    );
}

#[test]
fn test_is_equal_identical_and_different_versions() {
    let version = MetadataSchemaVersion {
        major: 1,
        minor: 2,
        patch: 3,
    };

    // Identical versions are equal.
    assert!(version.is_equal(&MetadataSchemaVersion {
        major: 1,
        minor: 2,
        patch: 3,
    }));

    // A difference in any single component makes them unequal.
    assert!(!version.is_equal(&MetadataSchemaVersion {
        major: 2,
        minor: 2,
        patch: 3,
    }));
    assert!(!version.is_equal(&MetadataSchemaVersion {
        major: 1,
        minor: 3,
        patch: 3,
    }));
    assert!(!version.is_equal(&MetadataSchemaVersion {
        major: 1,
        minor: 2,
        patch: 4,
    }));
}

#[test]
fn test_from_u32_maps_every_valid_discriminant() {
    assert!(MetadataFieldType::from_u32(0) == Some(MetadataFieldType::String));
    assert!(MetadataFieldType::from_u32(1) == Some(MetadataFieldType::Number));
    assert!(MetadataFieldType::from_u32(2) == Some(MetadataFieldType::Boolean));
    assert!(MetadataFieldType::from_u32(3) == Some(MetadataFieldType::Date));
    assert!(MetadataFieldType::from_u32(4) == Some(MetadataFieldType::Json));
}

#[test]
fn test_from_u32_rejects_values_at_or_above_five() {
    assert!(MetadataFieldType::from_u32(5) == None);
    assert!(MetadataFieldType::from_u32(6) == None);
    assert!(MetadataFieldType::from_u32(u32::MAX) == None);
}

#[test]
fn test_schema_record_construction_with_env() {
    let env = Env::default();
    let schema = MetadataSchemaRecord {
        id: String::from_str(&env, "schema-1"),
        name: String::from_str(&env, "Certificate Metadata"),
        version: MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 0,
        },
        fields: vec![
            &env,
            MetadataFieldRule {
                name: String::from_str(&env, "title"),
                field_type: MetadataFieldType::String,
                required: true,
                min_length: 1,
                max_length: 200,
            },
        ],
        required_fields: vec![&env, String::from_str(&env, "title")],
        allow_custom_fields: true,
        created_by: Address::generate(&env),
        created_at: 1_700_000_000,
        is_active: true,
        previous_version_id: None,
    };

    assert!(schema
        .version
        .is_equal(&MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 0,
        }));
    assert!(!schema
        .version
        .is_greater_than(&MetadataSchemaVersion {
            major: 1,
            minor: 0,
            patch: 0,
        }));

    assert_eq!(schema.fields.len(), 1);
    let rule = schema.fields.get(0).unwrap();
    assert!(rule.field_type == MetadataFieldType::String);
    assert!(rule.required);
    assert_eq!(rule.max_length, 200);
    assert_eq!(schema.required_fields.len(), 1);
    assert!(schema.previous_version_id.is_none());
}
