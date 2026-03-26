from celery.signals import task_failure

from .logging_utils import log_system_event


@task_failure.connect
def on_celery_task_failure(sender=None, task_id=None, exception=None, args=None, kwargs=None, einfo=None, **kw):
    """
    Hook global pour capter les échecs de tâches Celery et les loguer dans system_logs.
    """
    # Safe serialization des args et kwargs
    safe_args = str(args)[:500] if args else ""
    safe_kwargs = str(kwargs)[:500] if kwargs else ""

    metadata = {
        "task_name": sender.name if sender else "Unknown Task",
        "task_id": task_id,
        "args": safe_args,
        "kwargs": safe_kwargs,
        "traceback": str(einfo) if einfo else None,
    }

    log_system_event(
        event_type="celery_task_failure", description=f"Task {sender.name if sender else 'Unknown'} failed: {str(exception)}", metadata=metadata
    )
