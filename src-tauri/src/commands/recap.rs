use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::DB;

#[derive(serde::Deserialize)]
pub struct DelayQuery {
    delay: u64,
}

#[derive(serde::Serialize)]
pub struct StateSnapshot {
    pub state: Value,
    pub time: DateTime<Utc>,
}

#[tauri::command]
pub async fn range(delay: u64) -> Result<Vec<StateSnapshot>, String> {
    let snapshots = sqlx::query_as!(
        StateSnapshot,
        r#"select state, time from state where time >= $1"#,
        Utc::now() - Duration::from_secs(delay)
    )
    .fetch_all(DB.get().unwrap())
    .await;

    snapshots.map_err(|e| e.to_string())
}
