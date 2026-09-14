from app.schemas.classification import ClassificationResult


_results: dict[str, ClassificationResult] = {}


def save_classification(document_id: str, result: ClassificationResult) -> None:
    _results[document_id] = result


def get_classification(document_id: str) -> ClassificationResult | None:
    return _results.get(document_id)
