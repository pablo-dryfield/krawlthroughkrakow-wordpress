"""Deterministic session rotation is separate from retrying a command with an unknown result."""
import io,unittest
from tools.content_update_staging_connection import BoundedStagingFTPS


class FTP:
    def __init__(self, calls, number):self.calls,self.number,self.fail,self.closed=calls,number,None,False
    def command(self, kind, *args):
        self.calls.append((self.number,kind,*args))
        if self.fail==kind:raise EOFError('unknown result')
        return 'reply'
    def close(self):self.closed=True;self.calls.append((self.number,'close'))
    def sendcmd(self, value):return self.command('sendcmd',value)
    def retrbinary(self, command, callback):self.command('retrbinary',command);callback(b'known bytes')
    def storbinary(self, command, stream):return self.command('storbinary',command,stream.read())
    def delete(self, path):return self.command('delete',path)
    def rmd(self, path):return self.command('rmd',path)
    def rename(self, source, target):return self.command('rename',source,target)
    def mlsd(self, path):
        self.command('mlsd',path)
        def rows():
            yield 'known',{'type':'file'}
            if self.fail=='lazy-mlsd':raise EOFError('partial directory')
        return rows()


class BoundedConnectionTests(unittest.TestCase):
    def fixture(self, **kw):
        calls=[];connections=[];now=[0]
        def factory():
            value=FTP(calls,len(connections));connections.append(value);return value
        return BoundedStagingFTPS(factory,clock=lambda:now[0],**kw),calls,connections,now
    def test_connection_is_lazy_and_closed_transport_never_connects(self):
        ftp,calls,connections,now=self.fixture();self.assertEqual(connections,[]);ftp.close()
        with self.assertRaises(RuntimeError):ftp.delete('known')
        self.assertEqual(connections,[])
    def test_transfer_budget_rotates_before_next_operation_without_repetition(self):
        ftp,calls,connections,now=self.fixture(transfer_limit=2)
        ftp.retrbinary('RETR known',lambda data:None);ftp.mlsd('known');ftp.delete('known')
        self.assertEqual([(n,k) for n,k,*args in calls],[(0,'retrbinary'),(0,'mlsd'),(0,'close'),(1,'delete')]);self.assertEqual(ftp.statistics()['automaticRetries'],0)
    def test_control_command_budget_rotates_before_next_operation(self):
        ftp,calls,connections,now=self.fixture(command_limit=1);ftp.sendcmd('MLST known');ftp.rmd('known')
        self.assertEqual([(n,k) for n,k,*args in calls],[(0,'sendcmd'),(0,'close'),(1,'rmd')])
    def test_idle_session_is_replaced_before_command(self):
        ftp,calls,connections,now=self.fixture(idle_limit=20);ftp.sendcmd('MLST known');now[0]=20;ftp.rename('known-temp','known')
        self.assertTrue(connections[0].closed);self.assertEqual(calls[-1],(1,'rename','known-temp','known'))
    def test_uncertain_mutations_are_never_retried_or_followed_by_other_commands(self):
        for method,args in [('delete',('known',)),('rmd',('known',)),('rename',('a','b')),('storbinary',('STOR known',io.BytesIO(b'known')))]:
            with self.subTest(method=method):
                ftp,calls,connections,now=self.fixture();ftp.sendcmd('MLST known');connections[0].fail=method
                with self.assertRaises(EOFError):getattr(ftp,method)(*args)
                with self.assertRaises(RuntimeError):ftp.sendcmd('MLST known')
                self.assertEqual(len(connections),1);self.assertEqual(sum(c[1]==method for c in calls),1);self.assertTrue(ftp.statistics()['uncertainOperation'])
    def test_partial_directory_read_marks_transport_uncertain(self):
        ftp,calls,connections,now=self.fixture();ftp.sendcmd('MLST known');connections[0].fail='lazy-mlsd'
        with self.assertRaises(EOFError):ftp.mlsd('known')
        with self.assertRaises(RuntimeError):ftp.delete('known')
        self.assertEqual(len(connections),1)
    def test_partial_binary_read_is_not_replayed(self):
        ftp,calls,connections,now=self.fixture();ftp.sendcmd('MLST known');chunks=[]
        def fail(command, callback):callback(b'partial');raise EOFError('read failed')
        connections[0].retrbinary=fail
        with self.assertRaises(EOFError):ftp.retrbinary('RETR known',chunks.append)
        self.assertEqual(chunks,[b'partial'])
        with self.assertRaises(RuntimeError):ftp.retrbinary('RETR known',chunks.append)
    def test_connection_factory_failure_has_no_automatic_retry(self):
        count=[]
        def fail():count.append(1);raise OSError('connect failed')
        ftp=BoundedStagingFTPS(fail)
        with self.assertRaises(OSError):ftp.delete('known')
        with self.assertRaises(RuntimeError):ftp.delete('known')
        self.assertEqual(count,[1])
    def test_close_failure_prevents_new_connection_and_operation(self):
        ftp,calls,connections,now=self.fixture(command_limit=1);ftp.sendcmd('MLST known')
        def fail():raise OSError('local close failed')
        connections[0].close=fail
        with self.assertRaises(OSError):ftp.delete('known')
        self.assertEqual(len(connections),1);self.assertFalse(any(c[1]=='delete' for c in calls))
    def test_invalid_or_unbounded_options_refused_before_factory(self):
        for options in ({'transfer_limit':0},{'transfer_limit':33},{'transfer_limit':True},{'command_limit':513},{'idle_limit':301}):
            with self.assertRaises(ValueError):BoundedStagingFTPS(lambda:None,**options)


if __name__=='__main__':unittest.main()
