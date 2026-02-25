#[cfg(test)]
mod metadata_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    use crate::metadata::*;

    fn setup_env() -> Env {
        Env::default()
    }

    fn create_test_schema(env: &Env, creator: &Address) -> MetadataSchemaRecord {
        let mut fields = Vec::new(env);
        fields.push_back(MetadataFieldRule {
            name: String::from_str(env, "title"),
            field_type: MetadataFieldType::String,
            required: true,
            min_length: 1,
            max_length: 200,
        });
        fields.push_back(MetadataFieldRule {
            name: String::from_str(env, "courseName"),
            field_type: MetadataFieldType::String,
            required: true,
            min_length: 1,
            max_length: 500,
        });
        fields.push_back(MetadataFieldRule {
            name: String::from_str(env, "grade"),
            field_type: MetadataFieldType::String,
            required: false,
            min_length: 0,
            max_length: 10,
        });
        fields.push_back(MetadataFieldRule {
            name: String::from_str(env, "hours"),
            field_type: MetadataFieldType::Number,
            required: false,
            min_length: 0,
            max_length: 0,
        });

        let mut required_fields = Vec::new(env);
        required_fields.push_back(String::from_str(env, "title"));
        required_fields.push_back(String::from_str(env, "courseName"));

        MetadataSchemaRecord {
            id: String::from_str(env, "schema-001"),
            name: String::from_str(env, "course-certificate"),
            version: MetadataSchemaVersion {
                major: 1,
                minor: 0,
                patch: 0,
            },
            fields,
            required_fields,
            allow_custom_fields: true,
            created_by: creator.clone(),
            created_at: 1000,
            is_active: true,
            previous_version_id: None,
        }
    }

    #[test]
    fn test_register_schema() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);

        let result = register_schema(&env, schema.clone());
        assert!(result.is_ok());

        let fetched = get_schema(&env, &schema.id).unwrap();
        assert_eq!(fetched.name, schema.name);
        assert_eq!(fetched.version.major, 1);
        assert_eq!(fetched.fields.len(), 4);
    }

    #[test]
    fn test_register_duplicate_schema_fails() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);

        register_schema(&env, schema.clone()).unwrap();
        let result = register_schema(&env, schema);
        assert_eq!(result.err(), Some(MetadataError::SchemaAlreadyExists));
    }

    #[test]
    fn test_validate_valid_metadata() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "title"),
            value: String::from_str(&env, "Web Development Certificate"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "courseName"),
            value: String::from_str(&env, "Full Stack Web Development"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "grade"),
            value: String::from_str(&env, "A+"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-001");
        let cert_id = String::from_str(&env, "cert-001");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(result.valid);
        assert_eq!(result.errors.len(), 0);
    }

    #[test]
    fn test_validate_missing_required_fields() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "grade"),
            value: String::from_str(&env, "B+"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-001");
        let cert_id = String::from_str(&env, "cert-002");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
        assert_eq!(result.errors.len(), 2);
    }

    #[test]
    fn test_validate_type_mismatch() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "title"),
            value: String::from_str(&env, "Test Cert"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "courseName"),
            value: String::from_str(&env, "Course"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "hours"),
            value: String::from_str(&env, "forty"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-001");
        let cert_id = String::from_str(&env, "cert-003");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
        let type_error = result.errors.iter().find(|e| {
            e.constraint == String::from_str(&env, "type")
        });
        assert!(type_error.is_some());
    }

    #[test]
    fn test_validate_string_length_constraints() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "title"),
            value: String::from_str(&env, "OK Title"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "courseName"),
            value: String::from_str(&env, "Course"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "grade"),
            value: String::from_str(&env, "ABCDEFGHIJK"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-001");
        let cert_id = String::from_str(&env, "cert-004");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
        let length_error = result.errors.iter().find(|e| {
            e.constraint == String::from_str(&env, "maxLength")
        });
        assert!(length_error.is_some());
    }

    #[test]
    fn test_validate_custom_fields_allowed() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "title"),
            value: String::from_str(&env, "Title"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "courseName"),
            value: String::from_str(&env, "Course"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "customField"),
            value: String::from_str(&env, "custom value"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-001");
        let cert_id = String::from_str(&env, "cert-005");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(result.valid);
    }

    #[test]
    fn test_validate_custom_fields_disallowed() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let mut schema = create_test_schema(&env, &creator);
        schema.id = String::from_str(&env, "schema-strict");
        schema.allow_custom_fields = false;
        register_schema(&env, schema).unwrap();

        let mut entries = Vec::new(&env);
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "title"),
            value: String::from_str(&env, "Title"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "courseName"),
            value: String::from_str(&env, "Course"),
            value_type: MetadataFieldType::String,
        });
        entries.push_back(MetadataEntry {
            key: String::from_str(&env, "unauthorized"),
            value: String::from_str(&env, "nope"),
            value_type: MetadataFieldType::String,
        });

        let schema_id = String::from_str(&env, "schema-strict");
        let cert_id = String::from_str(&env, "cert-006");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
        let custom_error = result.errors.iter().find(|e| {
            e.constraint == String::from_str(&env, "noCustomFields")
        });
        assert!(custom_error.is_some());
    }

    #[test]
    fn test_validate_nonexistent_schema() {
        let env = setup_env();

        let entries = Vec::new(&env);
        let schema_id = String::from_str(&env, "nonexistent");
        let cert_id = String::from_str(&env, "cert-007");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
        assert_eq!(result.errors.len(), 1);
    }

    #[test]
    fn test_validate_inactive_schema() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let mut schema = create_test_schema(&env, &creator);
        schema.id = String::from_str(&env, "schema-inactive");
        schema.is_active = false;
        register_schema(&env, schema).unwrap();

        let entries = Vec::new(&env);
        let schema_id = String::from_str(&env, "schema-inactive");
        let cert_id = String::from_str(&env, "cert-008");
        let result = validate_metadata(&env, &schema_id, &entries, &cert_id);

        assert!(!result.valid);
    }

    #[test]
    fn test_upgrade_schema() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let mut new_fields = Vec::new(&env);
        new_fields.push_back(MetadataFieldRule {
            name: String::from_str(&env, "title"),
            field_type: MetadataFieldType::String,
            required: true,
            min_length: 1,
            max_length: 300,
        });
        new_fields.push_back(MetadataFieldRule {
            name: String::from_str(&env, "courseName"),
            field_type: MetadataFieldType::String,
            required: true,
            min_length: 1,
            max_length: 500,
        });
        new_fields.push_back(MetadataFieldRule {
            name: String::from_str(&env, "institution"),
            field_type: MetadataFieldType::String,
            required: true,
            min_length: 1,
            max_length: 200,
        });

        let mut required_fields = Vec::new(&env);
        required_fields.push_back(String::from_str(&env, "title"));
        required_fields.push_back(String::from_str(&env, "courseName"));
        required_fields.push_back(String::from_str(&env, "institution"));

        let new_schema = MetadataSchemaRecord {
            id: String::from_str(&env, "schema-002"),
            name: String::from_str(&env, "course-certificate"),
            version: MetadataSchemaVersion {
                major: 2,
                minor: 0,
                patch: 0,
            },
            fields: new_fields,
            required_fields,
            allow_custom_fields: true,
            created_by: creator.clone(),
            created_at: 2000,
            is_active: true,
            previous_version_id: Some(String::from_str(&env, "schema-001")),
        };

        let old_id = String::from_str(&env, "schema-001");
        let result = upgrade_schema(&env, &old_id, new_schema);
        assert!(result.is_ok());

        let old_schema = get_schema(&env, &old_id).unwrap();
        assert!(!old_schema.is_active);

        let new_id = String::from_str(&env, "schema-002");
        let new_schema = get_schema(&env, &new_id).unwrap();
        assert!(new_schema.is_active);
        assert_eq!(new_schema.version.major, 2);
    }

    #[test]
    fn test_upgrade_with_lower_version_fails() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema.clone()).unwrap();

        let downgrade = MetadataSchemaRecord {
            id: String::from_str(&env, "schema-bad"),
            version: MetadataSchemaVersion {
                major: 0,
                minor: 9,
                patch: 0,
            },
            ..schema
        };

        let old_id = String::from_str(&env, "schema-001");
        let result = upgrade_schema(&env, &old_id, downgrade);
        assert_eq!(result.err(), Some(MetadataError::InvalidVersion));
    }

    #[test]
    fn test_schema_history() {
        let env = setup_env();
        let creator = Address::generate(&env);
        let schema = create_test_schema(&env, &creator);
        register_schema(&env, schema).unwrap();

        let name = String::from_str(&env, "course-certificate");
        let history = get_schema_history(&env, &name);
        assert_eq!(history.len(), 1);
        assert_eq!(get_schema_count(&env), 1);
    }

    #[test]
    fn test_version_comparison() {
        let v1 = MetadataSchemaVersion { major: 1, minor: 0, patch: 0 };
        let v2 = MetadataSchemaVersion { major: 2, minor: 0, patch: 0 };
        let v1_1 = MetadataSchemaVersion { major: 1, minor: 1, patch: 0 };
        let v1_copy = MetadataSchemaVersion { major: 1, minor: 0, patch: 0 };

        assert!(v2.is_greater_than(&v1));
        assert!(!v1.is_greater_than(&v2));
        assert!(v1_1.is_greater_than(&v1));
        assert!(v1.is_equal(&v1_copy));
        assert!(!v1.is_equal(&v2));
    }
}
