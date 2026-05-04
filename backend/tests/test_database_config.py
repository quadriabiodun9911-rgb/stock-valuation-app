import importlib
import sys


def reload_database_module():
    if "database" in sys.modules:
        del sys.modules["database"]
    import database
    return importlib.reload(database)


def test_database_url_sqlite_override(tmp_path, monkeypatch):
    db_file = tmp_path / "override.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")

    database = reload_database_module()
    database.init_db()
    database.save_portfolio(
        1,
        [{"symbol": "AAPL", "shares": 2, "cost_basis": 150.0}],
        500.0,
    )

    portfolio = database.get_portfolio(1)

    assert db_file.exists()
    assert portfolio["cash"] == 500.0
    assert portfolio["positions"][0]["symbol"] == "AAPL"
