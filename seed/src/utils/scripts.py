import os
import importlib.util
from typing import List, Dict
from src import utils

LOG = utils.setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))

def execute(scripts: List[Dict] = None, _=None) -> List[str]:
    """Execute custom scripts defined in manifest."""
    if not scripts:
        LOG.info("No scripts to execute")
        return []

    # Count scripts to execute
    scripts_to_execute = [s for s in scripts if s.get('include_resource', False)]
    LOG.info(f"Found {len(scripts_to_execute)} script(s) to execute")

    results = []
    script_counter = 0

    for config in scripts:
        title = config.get('title', config.get('location', 'Unknown Script'))

        # Skip if include_resource is False
        if not config.get('include_resource', False):
            continue

        script_counter += 1

        script_path = config.get('location')
        if not script_path:
            LOG.warning(f"No location specified for {title}")
            continue

        if not os.path.exists(script_path):
            LOG.error(f"  Script {script_counter}/{len(scripts_to_execute)}: {title} - Script not found: {script_path}")
            continue

        LOG.info(f"  Script {script_counter}/{len(scripts_to_execute)}: {title}")
        LOG.info(f"    Executing {script_path}...")

        try:
            spec = importlib.util.spec_from_file_location("custom_script", script_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if hasattr(module, 'run'):
                result = module.run(script_config=config)
            elif hasattr(module, 'main'):
                result = module.main(script_config=config)
            else:
                LOG.warning(f"    Script has no 'run' or 'main' function")
                continue

            if result:
                results.append(result)

            LOG.info(f"    Completed {title}")
        except Exception as e:
            LOG.error(f"    Error executing {title}: {e}")

    LOG.info(f"Executed {len(results)}/{len(scripts_to_execute)} script(s) successfully")
    return results
