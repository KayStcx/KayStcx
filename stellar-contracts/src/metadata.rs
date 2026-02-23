use soroban_sdk::{contracttype, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataFieldType {
    String,
    Number,
    Boolean,
    Date,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataFieldRule {
    pub name: String,
    pub field_type: MetadataFieldType,
    pub required: bool,
    pub min_length: u32,
    pub max_length: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataSchemaVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MetadataSchemaRecord {
    pub id: String,
    pub name: String,
    pub version: MetadataSchemaVersion,
    pub fields: Vec<MetadataFieldRule>,
    pub required_fields: Vec<String>,
    pub allow_custom_fields: bool,
    pub created_by: soroban_sdk::Address,
    pub created_at: u64,
    pub is_active: bool,
    pub previous_version_id: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataFieldError {
    pub field: String,
    pub message: String,
    pub constraint: String,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MetadataValidationResult {
    pub valid: bool,
    pub errors: Vec<MetadataFieldError>,
    pub schema_id: String,
    pub schema_version: MetadataSchemaVersion,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataEntry {
    pub key: String,
    pub value: String,
    pub value_type: MetadataFieldType,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataError {
    SchemaNotFound,
    SchemaInactive,
    VersionConflict,
    SchemaAlreadyExists,
    Unauthorized,
    InvalidVersion,
}

#[contracttype]
#[derive(Clone)]
pub enum MetadataDataKey {
    Schema(String),
    SchemaHistory(String),
    SchemaCount,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SchemaRegisteredEvent {
    pub schema_id: String,
    pub name: String,
    pub version: MetadataSchemaVersion,
    pub created_by: soroban_sdk::Address,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SchemaUpgradedEvent {
    pub schema_id: String,
    pub name: String,
    pub from_version: MetadataSchemaVersion,
    pub to_version: MetadataSchemaVersion,
    pub upgraded_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MetadataValidatedEvent {
    pub certificate_id: String,
    pub schema_id: String,
    pub valid: bool,
    pub error_count: u32,
    pub validated_at: u64,
}

impl MetadataSchemaVersion {
    pub fn is_greater_than(&self, other: &MetadataSchemaVersion) -> bool {
        if self.major != other.major {
            return self.major > other.major;
        }
        if self.minor != other.minor {
            return self.minor > other.minor;
        }
        self.patch > other.patch
    }

    pub fn is_equal(&self, other: &MetadataSchemaVersion) -> bool {
        self.major == other.major && self.minor == other.minor && self.patch == other.patch
    }
}

pub fn register_schema(
    env: &Env,
    schema: MetadataSchemaRecord,
) -> Result<(), MetadataError> {
    let key = MetadataDataKey::Schema(schema.id.clone());
    if env.storage().instance().has(&key) {
        return Err(MetadataError::SchemaAlreadyExists);
    }

    env.storage().instance().set(&key, &schema);

    let history_key = MetadataDataKey::SchemaHistory(schema.name.clone());
    let mut history: Vec<String> = env
        .storage()
        .instance()
        .get(&history_key)
        .unwrap_or(Vec::new(env));
    history.push_back(schema.id.clone());
    env.storage().instance().set(&history_key, &history);

    let count: u64 = env
        .storage()
        .instance()
        .get(&MetadataDataKey::SchemaCount)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&MetadataDataKey::SchemaCount, &(count + 1));

    env.events().publish(
        (symbol_short!("schema_reg"),),
        SchemaRegisteredEvent {
            schema_id: schema.id,
            name: schema.name,
            version: schema.version,
            created_by: schema.created_by,
            created_at: schema.created_at,
        },
    );

    Ok(())
}

pub fn get_schema(env: &Env, schema_id: &String) -> Result<MetadataSchemaRecord, MetadataError> {
    let key = MetadataDataKey::Schema(schema_id.clone());
    env.storage()
        .instance()
        .get(&key)
        .ok_or(MetadataError::SchemaNotFound)
}

pub fn validate_metadata(
    env: &Env,
    schema_id: &String,
    entries: &Vec<MetadataEntry>,
    certificate_id: &String,
) -> MetadataValidationResult {
    let schema_result = get_schema(env, schema_id);

    if schema_result.is_err() {
        let mut errors = Vec::new(env);
        errors.push_back(MetadataFieldError {
            field: String::from_str(env, "_schema"),
            message: String::from_str(env, "Schema not found"),
            constraint: String::from_str(env, "exists"),
        });
        return MetadataValidationResult {
            valid: false,
            errors,
            schema_id: schema_id.clone(),
            schema_version: MetadataSchemaVersion {
                major: 0,
                minor: 0,
                patch: 0,
            },
        };
    }

    let schema = schema_result.unwrap();

    if !schema.is_active {
        let mut errors = Vec::new(env);
        errors.push_back(MetadataFieldError {
            field: String::from_str(env, "_schema"),
            message: String::from_str(env, "Schema is inactive"),
            constraint: String::from_str(env, "active"),
        });
        return MetadataValidationResult {
            valid: false,
            errors,
            schema_id: schema_id.clone(),
            schema_version: schema.version,
        };
    }

    let mut errors: Vec<MetadataFieldError> = Vec::new(env);

    let mut provided_keys: Vec<String> = Vec::new(env);
    for entry in entries.iter() {
        provided_keys.push_back(entry.key.clone());
    }

    for required_field in schema.required_fields.iter() {
        let mut found = false;
        for key in provided_keys.iter() {
            if key == required_field {
                found = true;
                break;
            }
        }
        if !found {
            errors.push_back(MetadataFieldError {
                field: required_field.clone(),
                message: String::from_str(env, "Required field missing"),
                constraint: String::from_str(env, "required"),
            });
        }
    }

    for entry in entries.iter() {
        let mut rule_found = false;
        for field_rule in schema.fields.iter() {
            if field_rule.name == entry.key {
                rule_found = true;

                if field_rule.field_type != entry.value_type {
                    errors.push_back(MetadataFieldError {
                        field: entry.key.clone(),
                        message: String::from_str(env, "Type mismatch"),
                        constraint: String::from_str(env, "type"),
                    });
                }

                if entry.value_type == MetadataFieldType::String {
                    let len = entry.value.len() as u32;
                    if field_rule.min_length > 0 && len < field_rule.min_length {
                        errors.push_back(MetadataFieldError {
                            field: entry.key.clone(),
                            message: String::from_str(env, "Value too short"),
                            constraint: String::from_str(env, "minLength"),
                        });
                    }
                    if field_rule.max_length > 0 && len > field_rule.max_length {
                        errors.push_back(MetadataFieldError {
                            field: entry.key.clone(),
                            message: String::from_str(env, "Value too long"),
                            constraint: String::from_str(env, "maxLength"),
                        });
                    }
                }

                break;
            }
        }

        if !rule_found && !schema.allow_custom_fields {
            errors.push_back(MetadataFieldError {
                field: entry.key.clone(),
                message: String::from_str(env, "Custom field not allowed"),
                constraint: String::from_str(env, "noCustomFields"),
            });
        }
    }

    let valid = errors.is_empty();
    let error_count = errors.len();

    env.events().publish(
        (symbol_short!("meta_valid"),),
        MetadataValidatedEvent {
            certificate_id: certificate_id.clone(),
            schema_id: schema_id.clone(),
            valid,
            error_count,
            validated_at: env.ledger().timestamp(),
        },
    );

    MetadataValidationResult {
        valid,
        errors,
        schema_id: schema_id.clone(),
        schema_version: schema.version,
    }
}

pub fn upgrade_schema(
    env: &Env,
    old_schema_id: &String,
    new_schema: MetadataSchemaRecord,
) -> Result<(), MetadataError> {
    let old_schema = get_schema(env, old_schema_id)?;

    if !old_schema.is_active {
        return Err(MetadataError::SchemaInactive);
    }

    if !new_schema.version.is_greater_than(&old_schema.version) {
        return Err(MetadataError::InvalidVersion);
    }

    let mut deactivated = old_schema.clone();
    deactivated.is_active = false;
    let old_key = MetadataDataKey::Schema(old_schema_id.clone());
    env.storage().instance().set(&old_key, &deactivated);

    let new_key = MetadataDataKey::Schema(new_schema.id.clone());
    env.storage().instance().set(&new_key, &new_schema);

    let history_key = MetadataDataKey::SchemaHistory(new_schema.name.clone());
    let mut history: Vec<String> = env
        .storage()
        .instance()
        .get(&history_key)
        .unwrap_or(Vec::new(env));
    history.push_back(new_schema.id.clone());
    env.storage().instance().set(&history_key, &history);

    env.events().publish(
        (symbol_short!("schema_up"),),
        SchemaUpgradedEvent {
            schema_id: new_schema.id,
            name: new_schema.name,
            from_version: old_schema.version,
            to_version: new_schema.version,
            upgraded_at: env.ledger().timestamp(),
        },
    );

    Ok(())
}

pub fn get_schema_history(env: &Env, name: &String) -> Vec<String> {
    let history_key = MetadataDataKey::SchemaHistory(name.clone());
    env.storage()
        .instance()
        .get(&history_key)
        .unwrap_or(Vec::new(env))
}

pub fn get_schema_count(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&MetadataDataKey::SchemaCount)
        .unwrap_or(0)
}
