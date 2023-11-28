import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function ConfirmationDialog(props: {
  onResult: (result: boolean) => void;
  show?: boolean;
  heading?: string;
  text?: string;
  acceptButtonText?: string;
  declineButtonText?: string;
}) {
  const decline = () => {
    props.onResult(false);
  };
  const accept = () => {
    props.onResult(true);
  };

  const text = props.text ?? 'Are you sure?';
  const acceptButtonText = props.acceptButtonText ?? 'Yes';
  const declineButtonText = props.declineButtonText ?? 'No';
  const heading = props.heading ?? 'Confirm';

  return (
    <Modal show={props.show === true} onHide={decline}>
      <Modal.Header closeButton>
        <Modal.Title>{heading}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{text}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={decline}>
          {declineButtonText}
        </Button>
        <Button variant="primary" onClick={accept}>
          {acceptButtonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
